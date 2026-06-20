// supabase/functions/recovery-codes/index.ts
//
// Handles FileVault's custom MFA recovery codes.
//
// Why this exists: Supabase's built-in `auth.mfa.verify()` only checks TOTP
// codes (and its own internal backup-code store, which we never populate).
// Our recovery codes are app-managed, so generating and verifying them must
// happen server-side with the service-role key — never in the browser —
// otherwise a client could read its own "is this code valid" check or forge
// a "used" flag.
//
// ── The aal2 problem ─────────────────────────────────────────────────────
// signInWithPassword() issues a valid aal1 session the instant the password
// is correct, before any TOTP/recovery challenge runs on login.html. Once a
// user is enrolled in MFA, index.html's checkAuth() treats an unsatisfied
// aal2 requirement as "signed out" — UNLESS a recovery code was just used.
//
// Supabase has no public API to upgrade a session from aal1 -> aal2 via a
// custom (non-TOTP) recovery code. We bridge that gap with a short-lived
// `mfa_recovery_bypass` flag written to user_profiles on a successful verify.
// index.html's checkAuth() reads this flag exactly once (then clears it) to
// let the user through despite the session still reporting aal1. It also
// expires after BYPASS_TTL_SECONDS as a hard backstop if the client never
// reads it (e.g. tab closed mid-redirect).
//
// Storage model (user_profiles table):
//   recovery_codes_hashed:        jsonb array of { hash: string, used: boolean }
//   recovery_codes_generated_at:  timestamptz, set whenever a new batch is generated
//   mfa_recovery_bypass:          jsonb { expires_at: string } | null, one-time AAL gate bypass
//
// Codes are SHA-256 hashed before they ever touch the database. The only
// place plaintext codes exist is: (1) momentarily in memory while this
// function runs, (2) the email sent to the user, and (3) the one-time
// response back to the browser that triggered generation. They are never
// written to the table in plaintext and never logged.
//
// Actions (POST body: { action, ...params }):
//   "generate" -> {}                  (requires valid user JWT)
//   "verify"   -> { code }            (requires valid user JWT, aal1 session ok)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const RESEND_FROM = Deno.env.get("RESEND_FROM") || "FileVault <noreply@filevault.works>";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const ALLOWED_ORIGINS = ["https://filevault.works", "https://www.filevault.works"];

// Bypass flag TTL — hard backstop in case the client never reads/clears it
// (e.g. tab closed mid-redirect). index.html's checkAuth() also clears it
// on first successful read, so in the normal case it never lives this long.
const BYPASS_TTL_SECONDS = 90;

// Computed once per-request (needs the Origin header), then threaded through
// to every Response — including jsonResponse() and the OPTIONS preflight —
// so we never accidentally reference a stale/undefined "corsHeaders" const.
function corsHeadersFor(req: Request) {
  const origin = req.headers.get("Origin") || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function jsonResponse(body: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generatePlaintextCodes(count = 8): string[] {
  // Cryptographically random, not Math.random() — recovery codes are a
  // security boundary equivalent to a password.
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789"; // no 0/1/o/l/i ambiguity
  const randomPart = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(4));
    return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  };
  return Array.from({ length: count }, () =>
    `${randomPart()}-${randomPart()}-${randomPart()}-${randomPart()}`
  );
}

async function sendRecoveryCodesEmail(email: string, codes: string[]) {
  const codeListHtml = codes
    .map((c) => `<div style="font-family:monospace;font-size:15px;background:#0f172a;color:#93c5fd;padding:8px 12px;border-radius:6px;margin:4px 0;">${c}</div>`)
    .join("");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: email,
      subject: "Your new FileVault recovery codes",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
          <h2 style="color:#0f172a;">New recovery codes generated</h2>
          <p>These codes were just generated for your FileVault account. Each code can be used <strong>once</strong> to sign in if you lose access to your authenticator app. Generating new codes invalidates all previous ones.</p>
          ${codeListHtml}
          <p style="color:#64748b;font-size:13px;">Store these somewhere safe — this is the only time they'll be emailed to you in full. If you didn't request this, secure your account immediately.</p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Resend send failed: ${res.status} ${text}`);
  }
}

Deno.serve(async (req: Request) => {
  const cors = corsHeadersFor(req);

  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405, cors);

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!jwt) return jsonResponse({ error: "Missing authorization" }, 401, cors);

    // Client scoped to the caller's JWT — used only to confirm identity.
    // Uses the real anon key as the client key, with the caller's JWT passed
    // in the Authorization header — the documented supabase-js pattern,
    // rather than passing the JWT itself as the client key.
    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !user) return jsonResponse({ error: "Invalid or expired session. Please sign in again." }, 401, cors);

    // Admin client for the actual reads/writes — service role bypasses RLS,
    // which is required since we're updating security-sensitive columns.
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    // ══════════════════════════════════════════════════════════════════
    // ACTION: generate
    // ══════════════════════════════════════════════════════════════════
    if (action === "generate") {
      const plaintextCodes = generatePlaintextCodes(8);
      const hashedRecords = await Promise.all(
        plaintextCodes.map(async (c) => ({ hash: await sha256Hex(c), used: false }))
      );

      const { error: dbErr } = await admin
        .from("user_profiles")
        .upsert(
          {
            id: user.id,
            recovery_codes_hashed: hashedRecords,
            recovery_codes_generated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );
      if (dbErr) {
        console.error("[recovery-codes] store error:", dbErr);
        return jsonResponse({ error: "Failed to store recovery codes. Please try again." }, 500, cors);
      }

      let emailSent = false;
      if (user.email && RESEND_API_KEY) {
        try {
          await sendRecoveryCodesEmail(user.email, plaintextCodes);
          emailSent = true;
        } catch (emailErr) {
          // Codes are already saved — don't fail the whole request over
          // email, but tell the client so it can warn the user to save them now.
          console.warn("[recovery-codes] email send failed:", emailErr);
        }
      }

      return jsonResponse({ codes: plaintextCodes, emailSent }, 200, cors);
    }

    // ══════════════════════════════════════════════════════════════════
    // ACTION: verify
    // ══════════════════════════════════════════════════════════════════
    if (action === "verify") {
      const code = String(body?.code || "").trim().toLowerCase().replace(/\s+/g, "");
      if (!code) return jsonResponse({ valid: false, error: "No code provided." }, 400, cors);

      const { data: profile, error: fetchErr } = await admin
        .from("user_profiles")
        .select("recovery_codes_hashed")
        .eq("id", user.id)
        .single();
      if (fetchErr || !profile) {
        return jsonResponse({ valid: false, error: "Could not look up recovery codes. Please try again." }, 500, cors);
      }

      const records: { hash: string; used: boolean }[] = profile.recovery_codes_hashed ?? [];
      if (records.length === 0) {
        return jsonResponse({ valid: false, error: "No recovery codes have been generated for this account." }, 400, cors);
      }

      const inputHash = await sha256Hex(code);
      const match = records.find((r) => r.hash === inputHash);

      if (!match) {
        return jsonResponse({ valid: false, error: "Invalid or already-used recovery code. Please try another." }, 200, cors);
      }
      if (match.used) {
        return jsonResponse({ valid: false, error: "This recovery code has already been used." }, 200, cors);
      }

      // Mark used (rewrite the full array — fine at this scale of 8 codes,
      // avoids needing a separate codes table / row-level lock) and keep the
      // record around for audit history instead of deleting it outright.
      const updatedRecords = records.map((r) => (r.hash === inputHash ? { ...r, used: true } : r));

      // ── Write the short-lived bypass flag ────────────────────────────
      // See top-of-file comment: this is what lets index.html's checkAuth()
      // let the user through despite the session still being aal1.
      const bypassExpiresAt = new Date(Date.now() + BYPASS_TTL_SECONDS * 1000).toISOString();

      const { error: updateErr } = await admin
        .from("user_profiles")
        .update({
          recovery_codes_hashed: updatedRecords,
          mfa_recovery_bypass: { expires_at: bypassExpiresAt },
        })
        .eq("id", user.id);

      if (updateErr) {
        console.error("[recovery-codes] update error:", updateErr);
        return jsonResponse({ valid: false, error: "Failed to record code usage. Please try again." }, 500, cors);
      }

      const codesRemaining = updatedRecords.filter((r) => !r.used).length;
      return jsonResponse(
        {
          valid: true,
          codesRemaining,
          warning: codesRemaining <= 2
            ? `Only ${codesRemaining} recovery code${codesRemaining === 1 ? "" : "s"} left. Generate new ones soon.`
            : undefined,
        },
        200,
        cors
      );
    }

    return jsonResponse({ error: `Unknown action: ${action}` }, 400, cors);
  } catch (e) {
    console.error("[recovery-codes] unexpected error:", e);
    return jsonResponse({ error: "Unexpected error" }, 500, cors);
  }
});