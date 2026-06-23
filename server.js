require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const Groq = require('groq-sdk');
const webpush = require('web-push');
const {
    createClient
} = require('@supabase/supabase-js');

const app = express();

// Sets a sensible set of HTTP security headers automatically:
// X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security,
// X-XSS-Protection, Referrer-Policy, and more. Applied before all routes.
// helmet's default CSP is disabled because each HTML page already defines
// its own via <meta http-equiv="Content-Security-Policy">.
app.use(helmet({ contentSecurityPolicy: false }));

// ── Startup environment checks ───────────────────────────────────────────────
if (!process.env.SUPABASE_ANON_KEY) {
    console.warn('⚠️  WARNING: SUPABASE_ANON_KEY is not set — GET /api/config will return 503.\n');
}
if (!process.env.PUSH_SECRET) {
    console.warn('\n⚠️  SECURITY WARNING: PUSH_SECRET is not set.');
    console.warn('   /api/push/cleanup, /api/cron/expiry-check, and /api/cron/announcement-cleanup');
    console.warn('   will refuse all requests (500) until PUSH_SECRET is set in your .env.\n');
}
if (!process.env.GROQ_API_KEY) {
    console.warn('⚠️  WARNING: GROQ_API_KEY is not set — AI endpoints will fail.\n');
}

// ── Simple in-memory rate limiter ────────────────────────────────────────────
// Limits each IP to `max` requests per `windowMs` on whichever routes it's applied to.
function rateLimiter({
    windowMs = 60_000,
    max = 20,
    message = 'Too many requests, slow down.'
} = {}) {
    const hits = new Map(); // ip → { count, resetAt }
    // Prune stale IPs every 5 minutes to avoid unbounded memory growth
    setInterval(() => {
        const now = Date.now();
        for (const [ip, rec] of hits)
            if (rec.resetAt < now) hits.delete(ip);
    }, 5 * 60_000).unref();

    return (req, res, next) => {
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        const now = Date.now();
        let rec = hits.get(ip);
        if (!rec || rec.resetAt < now) {
            rec = {
                count: 0,
                resetAt: now + windowMs
            };
            hits.set(ip, rec);
        }
        rec.count++;
        res.setHeader('X-RateLimit-Limit', max);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, max - rec.count));
        if (rec.count > max) {
            return res.status(429).json({
                error: message
            });
        }
        next();
    };
}

const aiRateLimit = rateLimiter({
    windowMs: 60_000,
    max: 15,
    message: 'AI rate limit reached. Try again in a minute.'
});
const pushRateLimit = rateLimiter({
    windowMs: 60_000,
    max: 10,
    message: 'Push rate limit reached.'
});

const ALLOWED_ORIGINS = [
    'https://filevault.works',
    'http://localhost:3000',
    'http://localhost:5500', // common live-server port for local dev
];
// Trust the first hop proxy (Render's load balancer) so req.ip reflects
// the real client IP rather than the proxy's address. Without this the
// in-memory rate limiter sees the same proxy IP for every request and
// rate-limits all users together instead of individually.
app.set('trust proxy', 1);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. curl, Render health checks, same-origin)
        if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
        callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
}));
// Limit request bodies to 64 KB — prevents someone sending a huge JSON
// payload to slow or crash the server.
app.use(express.json({ limit: '64kb' }));

// Guard Groq instantiation — mirrors the _supa pattern so a missing key fails
// loudly at startup (warn already printed above) rather than at first call.
const groq = process.env.GROQ_API_KEY ?
    new Groq({
        apiKey: process.env.GROQ_API_KEY
    }) :
    null;

// ── Supabase client (for persisting push subscriptions) ─────
// Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env
// Use the service_role key (not anon) so the server can bypass RLS.
const _supa = (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) ?
    createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY) :
    null;

// ── Notifications inbox: user lookup helpers ─────────────────────────────
// Shared by the announcement fan-out and the request-approval notifier
// below. supabase-js's auth.admin.listUsers() has no email-filter param
// (a known gap — see supabase/auth#880), so "find by email" pages through
// the full user list and matches client-side. Capped at 2000 users total,
// which comfortably covers a single class/cohort; revisit if FileVault
// ever serves a much larger user base.
// _listAllUserIds() replaced by _fanOutNotification() below.
// Previously this paged through up to 2000 auth users client-side — O(users)
// API calls, a silent 2000-user cap, and state lost on every server restart.
// The new approach uses a single Supabase RPC (fan_out_notification) that runs
// an INSERT ... SELECT directly in Postgres: no row cap, no round-trips
// proportional to user count. Falls back to the old paging path automatically
// if the RPC hasn't been created yet, so existing deployments keep working.
//
// Run this once in the Supabase SQL editor to enable the fast path:
//
//   create or replace function fan_out_notification(
//     p_type text, p_title text, p_body text
//   ) returns int language plpgsql security definer as $$
//   declare inserted int;
//   begin
//     insert into public.notifications (user_id, type, title, body)
//     select id, p_type, p_title, p_body from auth.users;
//     get diagnostics inserted = row_count;
//     return inserted;
//   end;
//   $$;
async function _fanOutNotification(type, title, body) {
    if (!_supa) return 0;

    // Fast path: single SQL round-trip via RPC
    const { data: count, error: rpcErr } = await _supa.rpc('fan_out_notification', {
        p_type: type,
        p_title: title,
        p_body: body,
    });
    if (!rpcErr) {
        console.log(`[fan-out] Notified ${count} user(s) via RPC`);
        return count || 0;
    }

    // Fallback: page through auth.users (works without the RPC)
    console.warn('[fan-out] RPC unavailable, falling back to paged insert:', rpcErr.message);
    const ids = [];
    for (let page = 1; page <= 20; page++) {
        const { data, error } = await _supa.auth.admin.listUsers({ page, perPage: 100 });
        if (error || !data?.users?.length) break;
        data.users.forEach(u => ids.push(u.id));
        if (data.users.length < 100) break;
    }
    if (!ids.length) return 0;
    const rows = ids.map(id => ({ user_id: id, type, title, body }));
    const { error: insertErr } = await _supa.from('notifications').insert(rows);
    if (insertErr) throw insertErr;
    return rows.length;
}

async function _findUserIdByEmail(email) {
    if (!_supa || !email) return null;
    const target = email.toLowerCase().trim();
    for (let page = 1; page <= 20; page++) {
        const {
            data,
            error
        } = await _supa.auth.admin.listUsers({
            page,
            perPage: 100
        });
        if (error || !data || !data.users || !data.users.length) break;
        const found = data.users.find(u => (u.email || '').toLowerCase().trim() === target);
        if (found) return found.id;
        if (data.users.length < 100) break;
    }
    return null;
}

// ── Manager auth middleware ──────────────────────────────────────────────
// Replaces the old PUSH_SECRET shared-secret pattern for endpoints that only
// a manager/admin should be able to call. A secret sent FROM the browser can
// never be a real secret once it's reachable in manager.html's page source —
// it can only ever be "obscured", not protected (this was the root cause of
// the hardcoded 'KINGJACH' string and the never-set window.pushSecret bug).
//
// This instead verifies the caller's actual Supabase session token — the
// same mechanism /api/delete-account already uses to prove identity — and
// then checks their role in user_profiles, mirroring manager.html's own
// checkAccess() function. Unlike checkAccess()'s client-side fallback
// (which fails OPEN — grants access — if the role lookup errors, see the
// comment in manager.html), this fails CLOSED: any error here denies access,
// since this is the server's last line of defense, not a client-side nicety.
//
// Usage: app.post('/api/whatever', requireManager, async (req, res) => {...})
// Expects an `Authorization: Bearer <access_token>` header. The frontend
// must send the user's current Supabase session.access_token (available via
// `(await _supabase.auth.getSession()).data.session.access_token`).
const MANAGER_EMAIL_ALLOWLIST = ['nharnharblay21@gmail.com']; // mirrors manager.html's ADMIN_EMAIL_ALLOWLIST
async function requireManager(req, res, next) {
    if (!_supa) return res.status(503).json({
        error: 'Supabase not configured'
    });

    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({
        error: 'Missing access token'
    });

    try {
        const {
            data: userData,
            error: userErr
        } = await _supa.auth.getUser(token);
        if (userErr || !userData?.user) {
            return res.status(401).json({
                error: 'Invalid or expired session. Please sign in again.'
            });
        }
        const user = userData.user;

        const {
            data: profile,
            error: profileErr
        } = await _supa
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        // Fail CLOSED: a lookup error here denies access rather than granting
        // it (the opposite of manager.html's client-side fallback — see note
        // above for why that asymmetry is intentional).
        if (profileErr) {
            console.warn('[requireManager] role lookup failed, denying access:', profileErr.message);
            return res.status(403).json({
                error: 'Could not verify manager access.'
            });
        }

        const isManager = profile?.role === 'admin' || profile?.role === 'manager' ||
            MANAGER_EMAIL_ALLOWLIST.includes(user.email || '');
        if (!isManager) {
            return res.status(403).json({
                error: 'Manager access required.'
            });
        }

        req.managerUser = user;
        next();
    } catch (e) {
        console.error('[requireManager] Unexpected error:', e);
        res.status(500).json({
            error: 'Auth check failed.'
        });
    }
}

// Any logged-in user — no role check. Use for endpoints that must not be
// anonymous but are not manager-only (e.g. /api/chat, /api/summarise).
async function requireAuth(req, res, next) {
    if (!_supa) return res.status(503).json({ error: 'Supabase not configured' });

    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Sign in to use this feature.' });

    try {
        const { data: userData, error: userErr } = await _supa.auth.getUser(token);
        if (userErr || !userData?.user) {
            return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
        }
        req.authUser = userData.user;
        next();
    } catch (e) {
        console.error('[requireAuth] Unexpected error:', e);
        res.status(500).json({ error: 'Auth check failed.' });
    }
}

// Per-user daily cap on AI endpoints. Must run after requireAuth (needs req.authUser).
// Stores counts in-memory; resets on server restart. For production persistence,
// swap the Map for a Supabase/Redis counter.
const _aiDailyCounts = new Map(); // key: `${userId}:${YYYY-MM-DD}` → count
const AI_DAILY_CAP = 50;
async function aiDailyCapCheck(req, res, next) {
    const userId = req.authUser?.id;
    if (!userId) return res.status(401).json({ error: 'Auth required before cap check.' });

    const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD' UTC
    const key = `${userId}:${today}`;
    const count = _aiDailyCounts.get(key) || 0;
    if (count >= AI_DAILY_CAP) {
        return res.status(429).json({
            error: `Daily AI limit reached (${AI_DAILY_CAP} requests). Try again tomorrow.`
        });
    }
    _aiDailyCounts.set(key, count + 1);
    next();
}

// ── Supabase push_subscriptions table helper ────────────────
// Required table (run once in Supabase SQL editor):
//
//   create table if not exists push_subscriptions (
//     endpoint   text primary key,
//     subscription jsonb not null,
//     user_id    text,                        -- Fix 8: Supabase auth UID or null for anon
//     role       text not null default 'student', -- Fix 7: 'student' | 'manager'
//     created_at timestamptz default now()
//   );
//   alter table push_subscriptions enable row level security;
//   -- Only server (service_role) can read/write:
//   create policy "Service role only" on push_subscriptions
//     using (false) with check (false);
//
// Migration — run once if the table already exists:
//   alter table push_subscriptions add column if not exists user_id text;
//   alter table push_subscriptions add column if not exists role text not null default 'student';
//
async function dbGetAllSubs() {
    if (!_supa) return [];
    const {
        data
    } = await _supa.from('push_subscriptions').select('subscription').neq('role', 'manager');
    return (data || []).map(r => r.subscription);
}
// Fix 7: fetch only manager subscriptions for targeted manager notifications.
async function dbGetManagerSubs() {
    if (!_supa) return [];
    const {
        data
    } = await _supa
        .from('push_subscriptions')
        .select('subscription')
        .eq('role', 'manager');
    return (data || []).map(r => r.subscription);
}
async function dbGetSubByEndpoint(endpoint) {
    if (!_supa) return null;
    const {
        data,
        error
    } = await _supa
        .from('push_subscriptions')
        .select('subscription')
        .eq('endpoint', endpoint)
        .single();
    if (error || !data) return null;
    return data.subscription;
}
async function dbDeleteSub(endpoint) {
    if (!_supa) return;
    await _supa.from('push_subscriptions').delete().eq('endpoint', endpoint);
}
// ── Web Push setup ──────────────────────────────────────────
// Generate VAPID keys once: npx web-push generate-vapid-keys
// Then set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in your .env (local)
// and in your Render dashboard under Environment Variables (production).
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        'mailto:nharnharblay21@gmail.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
}

app.get('/api/push/vapid-public-key', (req, res) => {
    res.json({
        key: process.env.VAPID_PUBLIC_KEY || null
    });
});

app.post('/api/push/subscribe', async (req, res) => {
    const {
        subscription,
        userId,
        role
    } = req.body; // Fix 8: accept userId + role
    if (!subscription || !subscription.endpoint) {
        return res.status(400).json({
            error: 'Invalid subscription'
        });
    }

    // Fix #14: surface Supabase write failures to the caller
    if (!_supa) {
        return res.status(503).json({
            error: 'Push storage not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
        });
    }

    // Fix 8: persist userId so we can target specific users later.
    // Fix 7: persist role ('manager' | 'student') so notify-manager only hits managers.
    // Callers that don't send a role default to 'student' — safe and backwards-compatible.
    const resolvedRole = role === 'manager' ? 'manager' : 'student';

    const {
        error
    } = await _supa
        .from('push_subscriptions')
        .upsert({
            endpoint: subscription.endpoint,
            subscription,
            user_id: userId || null, // Fix 8: store for targeted sends
            role: resolvedRole, // Fix 7: store for manager-only broadcast
        }, {
            onConflict: 'endpoint'
        });

    if (error) {
        console.error('[push/subscribe] DB write failed:', error);
        return res.status(500).json({
            error: 'Failed to save subscription: ' + error.message
        });
    }

    res.json({
        ok: true,
        message: 'Subscribed to push notifications.'
    });
});

app.post('/api/push/unsubscribe', async (req, res) => {
    const {
        endpoint
    } = req.body;
    await dbDeleteSub(endpoint);
    res.json({
        ok: true
    });
});

// Fix #13: proactive stale-subscription pruning.
// Subscriptions only get cleaned up on a failed send (410/404), so users who
// uninstall the PWA or clear site data without ever triggering a push leave
// dead rows in push_subscriptions forever.
// This endpoint sends a zero-byte "validation" ping to every stored
// subscription and deletes any that reply 404/410 (expired) or throw a
// network error suggesting the endpoint is gone.
// Call it from the same Render cron job as /api/cron/expiry-check, once/day.
app.get('/api/push/cleanup', async (req, res) => {
    if (!process.env.PUSH_SECRET) {
        console.error('[push/cleanup] PUSH_SECRET is not configured — refusing request');
        return res.status(500).json({
            error: 'Server misconfigured'
        });
    }
    const secret = req.query.secret || req.headers['x-cron-secret'];
    if (secret !== process.env.PUSH_SECRET) {
        return res.status(401).json({
            error: 'Unauthorized'
        });
    }
    if (!process.env.VAPID_PUBLIC_KEY) {
        return res.status(503).json({
            error: 'Push not configured'
        });
    }

    const allSubs = await dbGetAllSubs();
    let pruned = 0,
        kept = 0;

    for (const subscription of allSubs) {
        try {
            // Send a zero-byte payload — purely a liveness check, never shown to users.
            // Using "" (empty string) instead of a JSON object avoids some push services
            // displaying a blank notification to the user.
            await webpush.sendNotification(subscription, '');
            kept++;
        } catch (err) {
            if (err.statusCode === 410 || err.statusCode === 404) {
                await dbDeleteSub(subscription.endpoint);
                pruned++;
            } else {
                kept++; // transient error — keep the subscription
            }
        }
    }

    console.log(`[push/cleanup] total=${allSubs.length} pruned=${pruned} kept=${kept}`);
    res.json({
        ok: true,
        total: allSubs.length,
        pruned,
        kept
    });
});

// Notify manager subscribers about a new file request — called by upload-request.html.
// Fix 7: uses dbGetManagerSubs() so only subs with role='manager' receive this.
// Students with push enabled no longer get "New File Request" spam.
// Requires a valid Supabase session token (any authenticated user — not
// manager-only) so anonymous internet traffic can't spam managers with
// push notifications. Students always have a session when on index.html,
// so this is transparent to legitimate use.
// Rate-limited to 10 req/min as an additional layer.
app.post('/api/push/notify-manager', pushRateLimit, requireAuth, async (req, res) => {
    // req.authUser is set by requireAuth — any logged-in user may trigger this.
    // Payload is server-controlled; caller cannot supply title/body/url.
    const studentName = (req.authUser.email || 'A student').split('@')[0];
    if (!process.env.VAPID_PUBLIC_KEY) {
        return res.status(503).json({
            error: 'Push not configured. Set VAPID keys in .env'
        });
    }
    const payload = JSON.stringify({
        title: '📥 New File Request',
        body: `${studentName} has submitted a new file request.`,
        url: '/manager.html',
        icon: '/filevault%20logo.png',
        badge: '/filevault%20logo.png'
    });
    // Fix 7: only deliver to subscriptions registered with role='manager'
    const managerSubs = await dbGetManagerSubs();
    let sent = 0,
        failed = 0;
    const results = await Promise.allSettled(
        managerSubs.map(subscription => webpush.sendNotification(subscription, payload))
    );
    await Promise.all(results.map(async (result, i) => {
        if (result.status === 'fulfilled') {
            sent++;
        } else {
            const code = result.reason?.statusCode;
            if (code === 410 || code === 404) await dbDeleteSub(managerSubs[i].endpoint);
            failed++;
        }
    }));
    res.json({
        ok: true,
        sent,
        failed,
        total: managerSubs.length
    });
});

// Notify all subscribers — called by manager on new file upload or announcement
app.post('/api/push/notify', pushRateLimit, requireManager, async (req, res) => {
    const {
        title,
        body,
        url
    } = req.body;
    if (!process.env.VAPID_PUBLIC_KEY) {
        return res.status(503).json({
            error: 'Push not configured. Set VAPID keys in .env'
        });
    }
    const payload = JSON.stringify({
        title: title || 'FileVault',
        body: body || 'New files have been uploaded.',
        url: url || '/',
        icon: '/filevault%20logo.png',
        badge: '/filevault%20logo.png'
    });
    const allSubs = await dbGetAllSubs();
    let sent = 0,
        failed = 0;

    // Fire all sends in parallel — sequential await in a for…of loop times out
    // on Render's 30 s limit once the subscriber list grows.
    const results = await Promise.allSettled(
        allSubs.map(subscription => webpush.sendNotification(subscription, payload))
    );
    await Promise.all(results.map(async (result, i) => {
        if (result.status === 'fulfilled') {
            sent++;
        } else {
            const code = result.reason?.statusCode;
            if (code === 410 || code === 404) {
                await dbDeleteSub(allSubs[i].endpoint); // expired — clean up
            }
            failed++;
        }
    }));
    res.json({
        ok: true,
        sent,
        failed,
        total: allSubs.length
    });
});

// Notify a single subscriber by endpoint — used when manager approves a request
app.post('/api/push/notify-one', pushRateLimit, requireManager, async (req, res) => {
    const {
        endpoint,
        title,
        body,
        url
    } = req.body;
    if (!endpoint) return res.status(400).json({
        error: 'endpoint required'
    });
    if (!process.env.VAPID_PUBLIC_KEY) {
        return res.status(503).json({
            error: 'Push not configured'
        });
    }
    // Look up subscription from Supabase first, fall back to keys in request body
    let targetSub = await dbGetSubByEndpoint(endpoint);
    if (!targetSub) {
        const {
            keys
        } = req.body;
        if (keys && keys.p256dh && keys.auth) {
            targetSub = {
                endpoint,
                keys
            };
        } else {
            return res.status(404).json({
                error: 'Subscription not found. Student may need to enable push on FileVault.'
            });
        }
    }
    const payload = JSON.stringify({
        title: title || 'FileVault',
        body: body || 'Your file request has been fulfilled.',
        url: url || '/',
        icon: '/filevault%20logo.png',
        badge: '/filevault%20logo.png'
    });
    try {
        await webpush.sendNotification(targetSub, payload);
        res.json({
            ok: true
        });
    } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
            await dbDeleteSub(endpoint);
        }
        res.status(500).json({
            error: err.message
        });
    }
});

// ── Summarise queue ────────────────────────────────────────────────────────────────────────────
// Serialises Groq calls so a bulk upload of N files doesn't fire N simultaneous
// requests. At most SUMMARISE_CONCURRENCY jobs run at once; extras wait in line.
// Each job retries up to SUMMARISE_RETRY_MAX times with exponential backoff on 429s.
const SUMMARISE_CONCURRENCY = 2; // max parallel Groq calls at once
const SUMMARISE_RETRY_MAX = 3; // retry attempts per job before giving up
const SUMMARISE_RETRY_BASE = 800; // ms base delay — doubles each retry (800→1600→3200)

let _summariseActive = 0;
const _summariseQueue = []; // { resolve, reject, fn }

function enqueueSummarise(fn) {
    return new Promise((resolve, reject) => {
        _summariseQueue.push({
            resolve,
            reject,
            fn
        });
        _drainSummariseQueue();
    });
}

function _drainSummariseQueue() {
    while (_summariseActive < SUMMARISE_CONCURRENCY && _summariseQueue.length) {
        const {
            resolve,
            reject,
            fn
        } = _summariseQueue.shift();
        _summariseActive++;
        fn()
            .then(resolve)
            .catch(reject)
            .finally(() => {
                _summariseActive--;
                _drainSummariseQueue();
            });
    }
}

async function groqSummariseWithRetry(payload, attempt = 0) {
    try {
        return await groq.chat.completions.create(payload);
    } catch (err) {
        const is429 = err?.status === 429 || err?.statusCode === 429;
        if (is429 && attempt < SUMMARISE_RETRY_MAX) {
            // Honour Retry-After header if present, else use exponential backoff
            const retryAfterMs = parseInt(err?.headers?.['retry-after'] || '0', 10) * 1000 ||
                SUMMARISE_RETRY_BASE * Math.pow(2, attempt);
            console.warn(`[summarise] Groq 429 — retrying in ${retryAfterMs}ms (attempt ${attempt + 1}/${SUMMARISE_RETRY_MAX})`);
            await new Promise(r => setTimeout(r, retryAfterMs));
            return groqSummariseWithRetry(payload, attempt + 1);
        }
        throw err;
    }
}

// ── AI File Summary ─────────────────────────────────────────────────────────────────────────────
// POST /api/summarise  { fileName, folder, fileType }
// Returns { summary: "…" }  — a short 2-3 sentence description for the file.
// Called by manager.html after upload for PDF/PPTX/DOCX/XLSX files.
// Queued internally so bulk uploads don't hammer Groq simultaneously.
app.post('/api/summarise', aiRateLimit, requireAuth, aiDailyCapCheck, async (req, res) => {
    if (!groq) return res.status(503).json({
        error: 'AI not configured. Set GROQ_API_KEY.'
    });
    const {
        fileName,
        folder,
        fileType
    } = req.body;
    if (!fileName) return res.status(400).json({
        error: 'fileName required'
    });

    const ext = (fileName.split('.').pop() || '').toLowerCase();
    const typeMap = {
        pdf: 'PDF document',
        pptx: 'PowerPoint presentation',
        ppt: 'PowerPoint presentation',
        docx: 'Word document',
        doc: 'Word document',
        xlsx: 'Excel spreadsheet',
        csv: 'CSV data file',
        jpg: 'image',
        jpeg: 'image',
        png: 'image'
    };
    const friendlyType = typeMap[ext] || fileType || 'file';
    const folderHint = folder && folder !== 'Root' ? ` in the "${folder}" folder` : '';

    const groqPayload = {
        model: 'llama-3.1-8b-instant',
        max_tokens: 120,
        messages: [{
                role: 'system',
                content: `You generate short, accurate file descriptions for an academic file-sharing app called FileVault.
Given a file name, infer what the file most likely contains and write a concise 1-2 sentence description (max 160 chars) suitable for students.
Focus on the subject, topic, or course implied by the name. Be specific and helpful.
Reply with ONLY the description text — no quotes, no preamble, no extra punctuation.`
            },
            {
                role: 'user',
                content: `File name: "${fileName}" — this is a ${friendlyType}${folderHint}. Generate a description.`
            }
        ]
    };

    try {
        const response = await enqueueSummarise(() => groqSummariseWithRetry(groqPayload));
        const summary = (response.choices[0].message.content || '').trim().slice(0, 200);
        res.json({
            summary
        });
    } catch (error) {
        console.error('Summarise error:', error);
        res.status(500).json({
            error: error.message
        });
    }
});

// ── Expiry Notification Cron ─────────────────────────────────────────────────
// GET /api/cron/expiry-check  (secret via ?secret= or X-Cron-Secret header)
// Runs two warning windows per call so a single daily cron covers both:
//   • 72-hour window: files expiring between 48 h and 72 h from now  → early heads-up
//   • 24-hour window: files expiring within the next 24 h             → final warning
// Each window only sends if there are actually affected files, so quiet days
// produce no unnecessary pushes.
// Call once per day from a Render cron job or any external scheduler.
app.get('/api/cron/expiry-check', async (req, res) => {
    if (!process.env.PUSH_SECRET) {
        console.error('[cron/expiry-check] PUSH_SECRET is not configured — refusing request');
        return res.status(500).json({
            error: 'Server misconfigured'
        });
    }
    const secret = req.query.secret || req.headers['x-cron-secret'];
    if (secret !== process.env.PUSH_SECRET) {
        return res.status(401).json({
            error: 'Unauthorized'
        });
    }
    if (!_supa) return res.status(503).json({
        error: 'Supabase not configured'
    });
    if (!process.env.VAPID_PUBLIC_KEY) return res.status(503).json({
        error: 'Push not configured'
    });

    // Helper: push a payload to all subscribers, prune dead subs, return counts.
    async function broadcastPush(payload) {
        const allSubs = await dbGetAllSubs();
        let sent = 0,
            failed = 0;
        const results = await Promise.allSettled(
            allSubs.map(sub => webpush.sendNotification(sub, payload))
        );
        await Promise.all(results.map(async (result, i) => {
            if (result.status === 'fulfilled') {
                sent++;
            } else {
                const code = result.reason?.statusCode;
                if (code === 410 || code === 404) await dbDeleteSub(allSubs[i].endpoint);
                failed++;
            }
        }));
        return {
            total: allSubs.length,
            sent,
            failed
        };
    }

    // Helper: group files by folder and produce a readable summary string.
    function folderSummary(files) {
        const byFolder = {};
        files.forEach(f => {
            const key = f.folder_name || 'Root';
            if (!byFolder[key]) byFolder[key] = [];
            byFolder[key].push(f.file_name);
        });
        return Object.entries(byFolder)
            .map(([folder, fs]) => `${fs.length} file${fs.length > 1 ? 's' : ''} in ${folder}`)
            .join(', ');
    }

    try {
        const now = new Date();
        const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
        const in72h = new Date(now.getTime() + 72 * 60 * 60 * 1000);

        const report = {
            ok: true,
            windows: []
        };

        // ── 72-hour warning (files expiring between 48 h and 72 h out) ────────
        // We use the 48–72 h band (not 0–72 h) so files already caught by the
        // 24-hour window aren't double-notified on the same cron run.
        const {
            data: expiring72,
            error: err72
        } = await _supa
            .from('files_list')
            .select('file_name, folder_name, expires_at')
            .gt('expires_at', in48h.toISOString())
            .lte('expires_at', in72h.toISOString());
        if (err72) throw err72;

        if (expiring72 && expiring72.length > 0) {
            const summary = folderSummary(expiring72);
            const payload72 = JSON.stringify({
                title: '📅 Files expiring in 3 days',
                body: `${summary} will be removed from the Vault in about 72 hours. Download them soon.`,
                url: '/index.html',
                icon: '/filevault%20logo.png',
                badge: '/filevault%20logo.png'
            });
            const counts72 = await broadcastPush(payload72);
            console.log(`[Expiry cron][72h] ${expiring72.length} files. Push sent=${counts72.sent} failed=${counts72.failed}`);
            report.windows.push({
                window: '72h',
                filesExpiring: expiring72.length,
                ...counts72
            });
        } else {
            report.windows.push({
                window: '72h',
                filesExpiring: 0,
                message: 'No files expiring in 48–72h band'
            });
        }

        // ── 24-hour warning (files expiring within the next 24 h) ─────────────
        const {
            data: expiring24,
            error: err24
        } = await _supa
            .from('files_list')
            .select('file_name, folder_name, expires_at')
            .gt('expires_at', now.toISOString())
            .lte('expires_at', in24h.toISOString());
        if (err24) throw err24;

        if (expiring24 && expiring24.length > 0) {
            const summary = folderSummary(expiring24);
            const payload24 = JSON.stringify({
                title: '⏳ Files expiring soon!',
                body: `${summary} will be removed from the Vault within 24 hours. Download them now.`,
                url: '/index.html',
                icon: '/filevault%20logo.png',
                badge: '/filevault%20logo.png'
            });
            const counts24 = await broadcastPush(payload24);
            console.log(`[Expiry cron][24h] ${expiring24.length} files. Push sent=${counts24.sent} failed=${counts24.failed}`);
            report.windows.push({
                window: '24h',
                filesExpiring: expiring24.length,
                ...counts24
            });
        } else {
            report.windows.push({
                window: '24h',
                filesExpiring: 0,
                message: 'No files expiring in next 24h'
            });
        }

        res.json(report);
    } catch (err) {
        console.error('[Expiry cron] Error:', err);
        res.status(500).json({
            error: err.message
        });
    }
});

app.post('/api/chat', aiRateLimit, requireAuth, aiDailyCapCheck, async (req, res) => {
    if (!groq) return res.status(503).json({
        error: 'AI not configured. Set GROQ_API_KEY.'
    });
    try {
        const {
            message,
            history,
            systemPrompt
        } = req.body;

        // Strip ASCII control characters from the incoming message as defence-in-depth
        // against prompt-injection via adversarially named files or user input.
        // The client sanitizes quiz file data already; this catches anything that slips through.
        const cleanMessage = typeof message === 'string' ?
            message.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim() :
            '';
        if (!cleanMessage) return res.status(400).json({
            error: 'message is required'
        });

        // Defensively extract text from history entries — m.parts[0].text throws
        // if parts is missing, empty, or a future client sends a different shape.
        const historyMessages = (history || []).flatMap(m => {
            const text = m?.content ?? m?.parts?.[0]?.text;
            if (typeof text !== 'string' || !text.trim()) return []; // skip malformed entries
            const role = m.role === 'model' ? 'assistant' : 'user';
            return [{
                role,
                content: text
            }];
        });

        const messages = [{
                role: 'system',
                content: systemPrompt || ''
            },
            ...historyMessages,
            {
                role: 'user',
                content: message
            }
        ];

        const response = await groq.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            max_tokens: 1024,
            messages
        });

        res.json({
            text: response.choices[0].message.content
        });
    } catch (error) {
        console.error('SERVER ERROR:', error);
        res.status(500).json({
            error: error.message
        });
    }
});

// ── Announcements ────────────────────────────────────────────────────────────
// Announcements are stored in the `announcements` table in Supabase.
// Required table (run once in Supabase SQL editor):
//
//   create table if not exists announcements (
//     id          uuid primary key default gen_random_uuid(),
//     message     text not null,
//     expires_at  timestamptz,           -- null = never expires
//     created_at  timestamptz default now(),
//     created_by  text                   -- manager email/id for audit
//   );
//   alter table announcements enable row level security;
//   -- Students can read active announcements; only service_role can write
//   create policy "Public read active" on announcements
//     for select using (expires_at is null or expires_at > now());
//   create policy "Service role write" on announcements
//     for all using (false) with check (false);
//
// GET  /api/announcements        → returns the latest active announcement (if any)
// POST /api/announcements        → create/replace announcement (manager, requires secret)
// DELETE /api/announcements/:id  → delete announcement (manager, requires secret)

app.get('/api/announcements', async (req, res) => {
    if (!_supa) return res.status(503).json({
        error: 'Supabase not configured'
    });
    const {
        data,
        error
    } = await _supa
        .from('announcements')
        .select('id, message, event_date, expires_at, status, created_at')
        .neq('status', 'draft') // Fix 5: hide drafts from students
        .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
        .order('created_at', {
            ascending: false
        })
        .limit(1)
        .maybeSingle();
    if (error) return res.status(500).json({
        error: error.message
    });
    res.json({
        announcement: data || null
    });
});

app.post('/api/announcements', requireManager, async (req, res) => {
    const {
        message,
        expires_at,
        event_date,
        status,
        created_by
    } = req.body; // Fix 5
    if (!_supa) return res.status(503).json({
        error: 'Supabase not configured'
    });
    if (!message || !message.trim())
        return res.status(400).json({
            error: 'message is required'
        });

    // Fix 5: validate and accept status (draft | published)
    const allowedStatuses = ['draft', 'published'];
    const resolvedStatus = allowedStatuses.includes(status) ? status : 'published';

    // Validate expiry date if provided
    let expiresAt = null;
    if (expires_at) {
        expiresAt = new Date(expires_at);
        if (isNaN(expiresAt.getTime()) || expiresAt <= new Date())
            return res.status(400).json({
                error: 'expires_at must be a future date'
            });
        expiresAt = expiresAt.toISOString();
    }

    // Fix 5: validate and accept event_date
    let eventDate = null;
    if (event_date) {
        eventDate = new Date(event_date);
        if (isNaN(eventDate.getTime())) {
            return res.status(400).json({
                error: 'event_date must be a valid date'
            });
        }
        eventDate = eventDate.toISOString();
    }

    const {
        data,
        error
    } = await _supa.from('announcements').insert({
        message: message.trim().slice(0, 500),
        status: resolvedStatus, // Fix 5: persist draft/published
        event_date: eventDate, // Fix 5: persist event countdown date
        expires_at: expiresAt,
        created_by: created_by || null
    }).select('id, message, event_date, expires_at, status, created_at').single();

    if (error) return res.status(500).json({
        error: error.message
    });
    console.log(`[announcements] Created id=${data.id} status=${resolvedStatus} expires=${expiresAt || 'never'}`);

    // ── Fan out an inbox notification to every user, but only for published
    //    announcements — drafts aren't visible to students yet, so nothing
    //    should land in their inbox until it's actually published.
    //    Table: notifications (see schema comment in index.html, near
    //    toggleBookmark/syncBookmarksOnLogin — same table, type='announcement').
    //    Best-effort: failures here are logged but never fail the request,
    //    since the announcement itself was already created successfully.
    if (resolvedStatus === 'published' && _supa) {
        try {
            const body = data.message.length > 120 ? data.message.slice(0, 117) + '…' : data.message;
            const notified = await _fanOutNotification('announcement', 'New announcement', body);
            console.log(`[announcements] Notified ${notified} user(s) via inbox`);
        } catch (notifyErr) {
            console.warn('[announcements] Inbox fan-out failed (non-fatal):', notifyErr.message);
        }
    }

    res.json({
        ok: true,
        announcement: data
    });
});

// POST /api/notify-announcement  { message, secret }
// Fans an inbox notification out to every registered user. Separate from
// POST /api/announcements above (which also does this) because manager.html
// creates announcements via a direct browser→Supabase insert, not by calling
// that endpoint — see createAnnouncement()/publishAnnouncement() in
// manager.html, which call this endpoint as a fire-and-forget side effect
// alongside their existing /api/push/notify call, the same pattern used for
// /api/notify-request-status above.
app.post('/api/notify-announcement', requireManager, async (req, res) => {
    const {
        message
    } = req.body || {};
    if (!_supa) return res.status(503).json({
        error: 'Supabase not configured'
    });
    if (!message || !message.trim())
        return res.status(400).json({
            error: 'message is required'
        });

    try {
        const trimmed = message.trim();
        const body = trimmed.length > 120 ? trimmed.slice(0, 117) + '…' : trimmed;
        const notified = await _fanOutNotification('announcement', 'New announcement', body);
        res.json({ ok: true, notified });
    } catch (e) {
        res.status(500).json({
            error: e.message
        });
    }
});

app.delete('/api/announcements/:id', requireManager, async (req, res) => {
    if (!_supa) return res.status(503).json({
        error: 'Supabase not configured'
    });
    const {
        error
    } = await _supa.from('announcements').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({
        error: error.message
    });
    res.json({
        ok: true
    });
});

// ── Cron: prune expired announcements ────────────────────────────────────────
// Call from the same Render cron job as /api/cron/expiry-check
app.get('/api/cron/announcement-cleanup', async (req, res) => {
    if (!process.env.PUSH_SECRET) {
        console.error('[cron/announcement-cleanup] PUSH_SECRET is not configured — refusing request');
        return res.status(500).json({
            error: 'Server misconfigured'
        });
    }
    const secret = req.query.secret || req.headers['x-cron-secret'];
    if (secret !== process.env.PUSH_SECRET)
        return res.status(401).json({
            error: 'Unauthorized'
        });
    if (!_supa) return res.status(503).json({
        error: 'Supabase not configured'
    });
    const {
        error,
        count
    } = await _supa
        .from('announcements')
        .delete({
            count: 'exact'
        })
        .lt('expires_at', new Date().toISOString());
    if (error) return res.status(500).json({
        error: error.message
    });
    console.log(`[announcement-cleanup] Pruned ${count} expired announcements`);
    res.json({
        ok: true,
        pruned: count || 0
    });
});

// ── File Requests ─────────────────────────────────────────────────────────────
// Students submit requests via upload-request.html directly to Supabase.
// These server routes let managers list and update requests server-side.
//
// Uses the existing `upload_requests` table. Run these two ALTER statements
// once in the Supabase SQL editor to add the columns this code needs:
//
//   alter table upload_requests add column if not exists requester_name text;
//   alter table upload_requests add column if not exists manager_note text;
//
// Existing columns used: id, filename, description, reason, folder, status,
//   requester_email, subscriber_endpoint, subscriber_keys, created_at.

// GET /api/file-requests?token=<uuid>
// Public student status lookup — no auth required.
// Returns only safe fields; never exposes requester_email or subscriber keys.
app.get('/api/file-requests', async (req, res, next) => {
    if (!req.query.token) return next(); // no token → fall through to manager branch
    if (!_supa) return res.status(503).json({
        error: 'Supabase not configured'
    });
    const id = req.query.token.trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        return res.status(400).json({
            error: 'Invalid token format'
        });
    }
    const {
        data,
        error
    } = await _supa
        .from('upload_requests')
        .select('id, status, manager_note, description, folder, created_at, updated_at')
        .eq('id', id)
        .maybeSingle();
    if (error) return res.status(500).json({
        error: error.message
    });
    if (!data) return res.status(404).json({
        error: 'Request not found'
    });
    return res.json({
        request: data
    });
});

// GET /api/file-requests (no token param) — full manager listing.
// requireManager handles all auth — no duplicated logic needed here.
app.get('/api/file-requests', requireManager, async (req, res) => {
    if (!_supa) return res.status(503).json({
        error: 'Supabase not configured'
    });
    const {
        data,
        error
    } = await _supa
        .from('upload_requests')
        .select('id, filename, description, reason, folder, status, requester_name, requester_email, manager_note, created_at')
        .order('created_at', {
            ascending: false
        });
    if (error) return res.status(500).json({
        error: error.message
    });
    return res.json({
        requests: data || []
    });
});

// PATCH /api/file-requests/:id  { status, manager_note, secret }
// Manager updates a request status (fulfilled | dismissed) and optional note.
//
// NOTE: As of this writing, manager.html does NOT call this endpoint — it
// updates upload_requests.status directly via the browser Supabase client
// (anon key) instead, in confirmFulfillRequest()/confirmDismiss(). The
// inbox-notification logic below is correct but currently unreachable from
// the UI as a result. See POST /api/notify-request-status below for the
// endpoint manager.html actually calls today to fire these notifications,
// which reuses the same _findUserIdByEmail lookup. Left here in case this
// endpoint is wired up properly in a future refactor — at that point the
// two notification call sites should be consolidated into one.
app.patch('/api/file-requests/:id', requireManager, async (req, res) => {
    const {
        status,
        manager_note
    } = req.body;
    if (!_supa) return res.status(503).json({
        error: 'Supabase not configured'
    });
    const allowed = ['pending', 'fulfilled', 'dismissed'];
    if (status && !allowed.includes(status))
        return res.status(400).json({
            error: 'status must be pending, fulfilled, or dismissed'
        });

    const updates = {};
    if (status) updates.status = status;
    if (typeof manager_note === 'string') updates.manager_note = manager_note.trim().slice(0, 500);

    if (!Object.keys(updates).length)
        return res.status(400).json({
            error: 'Nothing to update'
        });

    const {
        data,
        error
    } = await _supa
        .from('upload_requests').update(updates).eq('id', req.params.id)
        .select('id, status, manager_note, filename, requester_email').single();
    if (error) return res.status(500).json({
        error: error.message
    });

    // ── Inbox notification on fulfillment ──────────────────────────────────
    // upload_requests is keyed by requester_email (free text — works for
    // anonymous, non-account requesters too, same as the account-deletion
    // cleanup at /api/delete-account matches on this same field). Only
    // registered users have somewhere to receive an inbox notification, so
    // we look up a user_id by email and skip silently if there's no match
    // (anonymous requester — nothing to notify into). See _findUserIdByEmail
    // above for why this pages through listUsers() rather than filtering.
    if (status === 'fulfilled' && data.requester_email && _supa) {
        try {
            const matchedUserId = await _findUserIdByEmail(data.requester_email);
            if (matchedUserId) {
                const {
                    error: notifErr
                } = await _supa.from('notifications').insert({
                    user_id: matchedUserId,
                    type: 'request_approved',
                    title: 'Your file request was approved',
                    body: data.filename ? `${data.filename} is now available.` : 'Your requested file is now available.',
                });
                if (notifErr) console.warn('[file-requests] Inbox notify failed (non-fatal):', notifErr.message);
            }
        } catch (notifyErr) {
            console.warn('[file-requests] Inbox notify lookup failed (non-fatal):', notifyErr.message);
        }
    }

    res.json({
        ok: true,
        request: data
    });
});

// POST /api/notify-new-file  { folder, filename, secret }
// Fans an inbox notification out to users subscribed to the given folder
// (table: folder_subscriptions — see schema comment in index.html, near
// toggleFolderSubscription/syncFolderSubsOnLogin). Called by manager.html
// after a successful upload, as a fire-and-forget side effect — uploads
// themselves go straight from the browser to Supabase Storage + files_list,
// this only handles the "who should be told" inbox fan-out, which needs the
// service-role key (folder_subscriptions has no public-read policy) so it
// has to happen here rather than client-side.
app.post('/api/notify-new-file', requireManager, async (req, res) => {
    const {
        folder,
        filename
    } = req.body || {};
    if (!_supa) return res.status(503).json({
        error: 'Supabase not configured'
    });
    if (!folder) return res.json({
        ok: true,
        notified: 0,
        reason: 'no folder (root upload — no subscribers possible)'
    });

    try {
        const {
            data: subs,
            error: subsErr
        } = await _supa
            .from('folder_subscriptions')
            .select('user_id')
            .eq('folder', folder);
        if (subsErr) return res.status(500).json({
            error: subsErr.message
        });
        if (!subs || !subs.length) return res.json({
            ok: true,
            notified: 0
        });

        const rows = subs.map(s => ({
            user_id: s.user_id,
            type: 'new_file',
            title: 'New file in ' + folder,
            body: filename ? `${filename} was uploaded.` : 'A new file was uploaded.',
        }));
        const {
            error: notifErr
        } = await _supa.from('notifications').insert(rows);
        if (notifErr) return res.status(500).json({
            error: notifErr.message
        });
        res.json({
            ok: true,
            notified: rows.length
        });
    } catch (e) {
        res.status(500).json({
            error: e.message
        });
    }
});

// POST /api/notify-request-status  { requesterEmail, status, filename }
// status: 'approved' | 'dismissed' — matches the actual values manager.html
// uses (NOT 'fulfilled', despite that being what this file's PATCH endpoint
// above expects — see the note on that endpoint). Called directly from
// manager.html's confirmFulfillRequest()/confirmDismiss() after they update
// upload_requests themselves via the anon-key browser client, since that
// client cannot call auth.admin.listUsers() (service-role only) to resolve
// requester_email into a user_id for the inbox notification.
app.post('/api/notify-request-status', requireManager, async (req, res) => {
    const {
        requesterEmail,
        status,
        filename
    } = req.body || {};
    if (!_supa) return res.status(503).json({
        error: 'Supabase not configured'
    });
    if (!requesterEmail || !['approved', 'dismissed'].includes(status))
        return res.status(400).json({
            error: 'requesterEmail and a valid status are required'
        });

    try {
        const matchedUserId = await _findUserIdByEmail(requesterEmail);
        if (!matchedUserId) {
            // No registered account for this email — nothing to notify into.
            // Not an error: most requesters may be anonymous.
            return res.json({
                ok: true,
                notified: false,
                reason: 'no matching account'
            });
        }
        const isApproved = status === 'approved';
        const {
            error: notifErr
        } = await _supa.from('notifications').insert({
            user_id: matchedUserId,
            type: isApproved ? 'request_approved' : 'request_dismissed',
            title: isApproved ? 'Your file request was approved' : 'Your file request was dismissed',
            body: isApproved ?
                (filename ? `${filename} is now available.` : 'Your requested file is now available.') :
                (filename ? `Your request for "${filename}" was dismissed.` : 'Your file request was dismissed.'),
        });
        if (notifErr) return res.status(500).json({
            error: notifErr.message
        });
        res.json({
            ok: true,
            notified: true
        });
    } catch (e) {
        res.status(500).json({
            error: e.message
        });
    }
});

// ── Delete Account ───────────────────────────────────────────────────────────
// Called from profile.html's Danger Zone. The browser only ever holds the
// anon key, which cannot delete an auth user — that requires the
// service-role key, which only lives here on the server. This endpoint:
//   1. Verifies the caller's own Supabase access token (so a user can only
//      ever delete their OWN account, never anyone else's).
//   2. Best-effort cleans up rows tied to that user in other tables.
//   3. Calls supabase.auth.admin.deleteUser() to actually remove the account.
//
// Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (already used elsewhere
// in this file) — no extra setup needed.
const deleteAccountRateLimit = rateLimiter({
    windowMs: 60_000,
    max: 5,
    message: 'Too many delete attempts. Try again shortly.'
});

app.post('/api/delete-account', deleteAccountRateLimit, async (req, res) => {
    if (!_supa) return res.status(503).json({
        error: 'Supabase not configured'
    });

    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({
        error: 'Missing access token'
    });

    // Validate the token against Supabase Auth — this is what guarantees a
    // user can only delete the account the token actually belongs to.
    const {
        data: userData,
        error: userErr
    } = await _supa.auth.getUser(token);
    if (userErr || !userData?.user) {
        return res.status(401).json({
            error: 'Invalid or expired session. Please sign in again.'
        });
    }
    const user = userData.user;

    try {
        // Best-effort cleanup of rows/files tied to this user first. None of
        // these need to succeed for the account deletion itself to proceed —
        // a stray leftover row in a side table is harmless once the auth user
        // (and therefore the user's ability to sign in) is gone.
        await Promise.allSettled([
            _supa.from('user_downloads').delete().eq('user_id', user.id),
            _supa.from('upload_requests').delete().eq('requester_email', user.email),
            _supa.from('notifications').delete().eq('user_id', user.id),
            _supa.storage.from('avatars').remove([
                `${user.id}/avatar.jpg`, `${user.id}/avatar.jpeg`,
                `${user.id}/avatar.png`, `${user.id}/avatar.gif`, `${user.id}/avatar.webp`
            ]),
        ]);

        const {
            error: delErr
        } = await _supa.auth.admin.deleteUser(user.id);
        if (delErr) {
            console.error('[delete-account] auth.admin.deleteUser failed:', delErr);
            return res.status(500).json({
                error: delErr.message
            });
        }

        console.log(`[delete-account] Deleted user ${user.id} (${user.email})`);
        res.json({
            ok: true
        });
    } catch (err) {
        console.error('[delete-account] Error:', err);
        res.status(500).json({
            error: 'Failed to delete account: ' + err.message
        });
    }
});

// ── Public config endpoint ───────────────────────────────────────────────────
// GET /api/config
// Returns the Supabase anon key and URL so frontend files never need them
// hardcoded. Rotate SUPABASE_ANON_KEY in your env without touching any HTML.
app.get('/api/config', (req, res) => {
    const supabaseUrl = process.env.SUPABASE_URL || null;
    const supabaseAnon = process.env.SUPABASE_ANON_KEY || null;
    if (!supabaseUrl || !supabaseAnon) {
        return res.status(503).json({
            error: 'Server config not ready. Set SUPABASE_URL and SUPABASE_ANON_KEY.'
        });
    }
    res.json({
        supabaseUrl,
        supabaseAnonKey: supabaseAnon
    });
});

// ── Health check ─────────────────────────────────────────────────────────────
// GET /health  — basic liveness (used by Render, load balancers, etc.)
// GET /api/health — extended diagnostics: checks Supabase + Groq reachability
app.get('/health', (req, res) => res.json({
    status: 'ok',
    uptime: process.uptime()
}));

app.get('/api/health', async (req, res) => {
    const result = {
        status: 'ok',
        uptime: process.uptime(),
        supabase: 'unconfigured',
        groq: 'unconfigured',
    };

    // ── Supabase ping (5 s timeout) ──────────────────────────────────────────
    if (_supa) {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 5_000);
            // A lightweight query: fetch zero rows from a known table
            const {
                error
            } = await _supa
                .from('files_list')
                .select('id', {
                    count: 'exact',
                    head: true
                })
                .abortSignal(controller.signal);
            clearTimeout(timer);
            result.supabase = error ? `error: ${error.message}` : 'ok';
        } catch (err) {
            result.supabase = err.name === 'AbortError' ? 'timeout' : `error: ${err.message}`;
        }
    }

    // ── Groq ping (5 s timeout) ──────────────────────────────────────────────
    if (groq) {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 5_000);
            // Smallest possible Groq call — 1 token, no meaningful output
            await groq.chat.completions.create({
                model: 'llama-3.1-8b-instant',
                max_tokens: 1,
                messages: [{
                    role: 'user',
                    content: 'ping'
                }],
            }, {
                signal: controller.signal
            });
            clearTimeout(timer);
            result.groq = 'ok';
        } catch (err) {
            result.groq = err.name === 'AbortError' ? 'timeout' : `error: ${err.message}`;
        }
    }

    // Report degraded rather than 500 so uptime monitors still see a response
    if (result.supabase !== 'ok' || result.groq !== 'ok') result.status = 'degraded';
    res.status(result.status === 'ok' ? 200 : 207).json(result);
});

// ── Global error handler ─────────────────────────────────────────────────────
// Catches any error passed to next(err) or thrown synchronously in a route.
// Prevents Express from leaking stack traces to clients in production.
app.use((err, req, res, _next) => {
    console.error('[global error handler]', err);
    res.status(500).json({
        error: 'Internal server error'
    });
});

// ── Unhandled rejection / exception guards ───────────────────────────────────
// Prevents a single bad Supabase or Groq response from crashing the process
// and leaving counters (like _summariseActive) in an inconsistent state.
process.on('unhandledRejection', (reason) => {
    console.error('[unhandledRejection]', reason);
});
process.on('uncaughtException', (err) => {
    console.error('[uncaughtException]', err);
    // Don't exit — Render will restart the service anyway if it truly crashes.
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
        console.warn('\n⚠️  PUSH NOTIFICATIONS DISABLED: VAPID keys not set.');
        console.warn('   Run: npx web-push generate-vapid-keys');
        console.warn('   Then add VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to your environment.\n');
    }
});