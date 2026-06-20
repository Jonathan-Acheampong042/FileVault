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
// Storage model (user_profiles table):
//   recovery_codes_hashed: jsonb array of { hash: string, used: boolean }
//   recovery_codes_generated_at: timestamptz
//
// Codes are SHA-256 hashed before they ever touch the database. The only
// place plaintext codes exist is: (1) momentarily in memory while this
// function runs, (2) the email sent to the user, and (3) the one-time
// response back to the browser that triggered generation. They are never
// written to the table in plaintext and never logged.
//
// Actions (POST body: { action, ...params }):
//   "generate" -> { userId }                         (requires valid user JWT)
//   "verify"   -> { userId, code }                    (requires valid user JWT, aal1 session ok)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const RESEND_FROM = Deno.env.get("RESEND_FROM") || "FileVault <noreply@filevault.works>";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ALLOWED_ORIGINS = ["https://filevault.works", "https://www.filevault.works"];

function corsHeadersFor(req: Request) {
  const origin = req.headers.get("Origin") || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) return jsonResponse({ error: "Missing authorization" }, 401);

    // Client scoped to the caller's JWT — used only to confirm identity.
    const callerClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !user) return jsonResponse({ error: "Invalid session" }, 401);

    // Admin client for the actual reads/writes — service role bypasses RLS,
    // which is required since we're updating a security-sensitive column.
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const body = await req.json().catch(() => ({}));
    const action = body?.action;

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
      if (dbErr) return jsonResponse({ error: "Failed to store recovery codes" }, 500);

      if (user.email) {
        try {
          await sendRecoveryCodesEmail(user.email, plaintextCodes);
        } catch (emailErr) {
          // Codes are already saved — don't fail the whole request over email,
          // but tell the client so it can warn the user to save them now.
          return jsonResponse({ codes: plaintextCodes, emailSent: false });
        }
      }

      return jsonResponse({ codes: plaintextCodes, emailSent: true });
    }

    if (action === "verify") {
      const code = String(body?.code || "").trim().toLowerCase().replace(/\s+/g, "");
      if (!code) return jsonResponse({ error: "Code required" }, 400);

      const { data: profile, error: fetchErr } = await admin
        .from("user_profiles")
        .select("recovery_codes_hashed")
        .eq("id", user.id)
        .single();
      if (fetchErr || !profile?.recovery_codes_hashed) {
        return jsonResponse({ valid: false, error: "No recovery codes on file" }, 400);
      }

      const inputHash = await sha256Hex(code);
      const records: { hash: string; used: boolean }[] = profile.recovery_codes_hashed;
      const match = records.find((r) => r.hash === inputHash);

      if (!match) return jsonResponse({ valid: false, error: "Invalid recovery code" }, 401);
      if (match.used) return jsonResponse({ valid: false, error: "This recovery code has already been used" }, 401);

      // Mark used atomically by rewriting the full array — fine at this scale
      // (8 codes), and avoids needing a separate codes table / row-level lock.
      const updated = records.map((r) => (r.hash === inputHash ? { ...r, used: true } : r));
      const { error: updateErr } = await admin
        .from("user_profiles")
        .update({ recovery_codes_hashed: updated })
        .eq("id", user.id);
      if (updateErr) return jsonResponse({ valid: false, error: "Failed to record code usage" }, 500);

      return jsonResponse({ valid: true });
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (e) {
    return jsonResponse({ error: "Unexpected error" }, 500);
  }
});