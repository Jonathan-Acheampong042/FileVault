require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');
const webpush = require('web-push');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// ── Startup environment checks ───────────────────────────────────────────────
if (!process.env.PUSH_SECRET) {
  console.warn('\n⚠️  SECURITY WARNING: PUSH_SECRET is not set.');
  console.warn('   /api/push/notify and /api/cron/expiry-check are UNPROTECTED.');
  console.warn('   Set PUSH_SECRET in your .env to secure these endpoints.\n');
}
if (!process.env.GROQ_API_KEY) {
  console.warn('⚠️  WARNING: GROQ_API_KEY is not set — AI endpoints will fail.\n');
}

// ── Simple in-memory rate limiter ────────────────────────────────────────────
// Limits each IP to `max` requests per `windowMs` on whichever routes it's applied to.
function rateLimiter({ windowMs = 60_000, max = 20, message = 'Too many requests, slow down.' } = {}) {
  const hits = new Map(); // ip → { count, resetAt }
  // Prune stale IPs every 5 minutes to avoid unbounded memory growth
  setInterval(() => {
    const now = Date.now();
    for (const [ip, rec] of hits) if (rec.resetAt < now) hits.delete(ip);
  }, 5 * 60_000).unref();

  return (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    let rec = hits.get(ip);
    if (!rec || rec.resetAt < now) {
      rec = { count: 0, resetAt: now + windowMs };
      hits.set(ip, rec);
    }
    rec.count++;
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - rec.count));
    if (rec.count > max) {
      return res.status(429).json({ error: message });
    }
    next();
  };
}

const aiRateLimit   = rateLimiter({ windowMs: 60_000, max: 15, message: 'AI rate limit reached. Try again in a minute.' });
const pushRateLimit = rateLimiter({ windowMs: 60_000, max: 10, message: 'Push rate limit reached.' });

const ALLOWED_ORIGINS = [
  'https://filevault.works',
  'http://localhost:3000',
  'http://localhost:5500', // common live-server port for local dev
];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, Render health checks, same-origin)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST'],
  credentials: true,
}));
app.use(express.json());

// Guard Groq instantiation — mirrors the _supa pattern so a missing key fails
// loudly at startup (warn already printed above) rather than at first call.
const groq = process.env.GROQ_API_KEY
    ? new Groq({ apiKey: process.env.GROQ_API_KEY })
    : null;

// ── Supabase client (for persisting push subscriptions) ─────
// Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env
// Use the service_role key (not anon) so the server can bypass RLS.
const _supa = (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

// ── Supabase push_subscriptions table helper ────────────────
// Required table (run once in Supabase SQL editor):
//
//   create table if not exists push_subscriptions (
//     endpoint text primary key,
//     subscription jsonb not null,
//     created_at timestamptz default now()
//   );
//   alter table push_subscriptions enable row level security;
//   -- Only server (service_role) can read/write:
//   create policy "Service role only" on push_subscriptions
//     using (false) with check (false);
//
async function dbGetAllSubs() {
    if (!_supa) return [];
    const { data } = await _supa.from('push_subscriptions').select('subscription');
    return (data || []).map(r => r.subscription);
}
async function dbGetSubByEndpoint(endpoint) {
    if (!_supa) return null;
    const { data, error } = await _supa
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
    res.json({ key: process.env.VAPID_PUBLIC_KEY || null });
});

app.post('/api/push/subscribe', async (req, res) => {
    const { subscription, userId } = req.body;
    if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ error: 'Invalid subscription' });
    }

    // Fix #14: surface Supabase write failures to the caller
    if (!_supa) {
        return res.status(503).json({ error: 'Push storage not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' });
    }

    const { error } = await _supa
        .from('push_subscriptions')
        .upsert(
            { endpoint: subscription.endpoint, subscription },
            { onConflict: 'endpoint' }
        );

    if (error) {
        console.error('[push/subscribe] DB write failed:', error);
        return res.status(500).json({ error: 'Failed to save subscription: ' + error.message });
    }

    res.json({ ok: true, message: 'Subscribed to push notifications.' });
});

app.post('/api/push/unsubscribe', async (req, res) => {
    const { endpoint } = req.body;
    await dbDeleteSub(endpoint);
    res.json({ ok: true });
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
    const secret = req.query.secret || req.headers['x-cron-secret'];
    if (process.env.PUSH_SECRET && secret !== process.env.PUSH_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!process.env.VAPID_PUBLIC_KEY) {
        return res.status(503).json({ error: 'Push not configured' });
    }

    const allSubs = await dbGetAllSubs();
    let pruned = 0, kept = 0;

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
    res.json({ ok: true, total: allSubs.length, pruned, kept });
});

// Notify all subscribers about a new file request — called by upload-request.html.
// This endpoint is intentionally unprotected (no secret) because it is called from
// student-facing pages that don't have the push secret.
// Rate-limited to 10 req/min to prevent abuse.
app.post('/api/push/notify-manager', pushRateLimit, async (req, res) => {
    const { title, body, url } = req.body;
    if (!process.env.VAPID_PUBLIC_KEY) {
        return res.status(503).json({ error: 'Push not configured. Set VAPID keys in .env' });
    }
    const payload = JSON.stringify({
        title: title || '📥 New File Request',
        body: body || 'A student has submitted a new file request.',
        url: url || '/manager.html',
        icon: '/filevault%20logo.png',
        badge: '/filevault%20logo.png'
    });
    const allSubs = await dbGetAllSubs();
    let sent = 0, failed = 0;
    const results = await Promise.allSettled(
        allSubs.map(subscription => webpush.sendNotification(subscription, payload))
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
    res.json({ ok: true, sent, failed, total: allSubs.length });
});

// Notify all subscribers — called by manager on new file upload or announcement
app.post('/api/push/notify', pushRateLimit, async (req, res) => {
    const { title, body, url, secret } = req.body;
    // Simple secret guard — set PUSH_SECRET in .env
    if (process.env.PUSH_SECRET && secret !== process.env.PUSH_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!process.env.VAPID_PUBLIC_KEY) {
        return res.status(503).json({ error: 'Push not configured. Set VAPID keys in .env' });
    }
    const payload = JSON.stringify({
        title: title || 'FileVault',
        body: body || 'New files have been uploaded.',
        url: url || '/',
        icon: '/filevault%20logo.png',
        badge: '/filevault%20logo.png'
    });
    const allSubs = await dbGetAllSubs();
    let sent = 0, failed = 0;

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
    res.json({ ok: true, sent, failed, total: allSubs.length });
});

// Notify a single subscriber by endpoint — used when manager approves a request
app.post('/api/push/notify-one', pushRateLimit, async (req, res) => {
    // Auth: same secret guard as /api/push/notify
    const secret = req.body.secret || req.headers['x-push-secret'];
    if (process.env.PUSH_SECRET && secret !== process.env.PUSH_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const { endpoint, title, body, url } = req.body;
    if (!endpoint) return res.status(400).json({ error: 'endpoint required' });
    if (!process.env.VAPID_PUBLIC_KEY) {
        return res.status(503).json({ error: 'Push not configured' });
    }
    // Look up subscription from Supabase first, fall back to keys in request body
    let targetSub = await dbGetSubByEndpoint(endpoint);
    if (!targetSub) {
        const { keys } = req.body;
        if (keys && keys.p256dh && keys.auth) {
            targetSub = { endpoint, keys };
        } else {
            return res.status(404).json({ error: 'Subscription not found. Student may need to enable push on FileVault.' });
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
        res.json({ ok: true });
    } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
            await dbDeleteSub(endpoint);
        }
        res.status(500).json({ error: err.message });
    }
});


// ── Summarise queue ────────────────────────────────────────────────────────────────────────────
// Serialises Groq calls so a bulk upload of N files doesn't fire N simultaneous
// requests. At most SUMMARISE_CONCURRENCY jobs run at once; extras wait in line.
// Each job retries up to SUMMARISE_RETRY_MAX times with exponential backoff on 429s.
const SUMMARISE_CONCURRENCY = 2;   // max parallel Groq calls at once
const SUMMARISE_RETRY_MAX   = 3;   // retry attempts per job before giving up
const SUMMARISE_RETRY_BASE  = 800; // ms base delay — doubles each retry (800→1600→3200)

let _summariseActive = 0;
const _summariseQueue = []; // { resolve, reject, fn }

function enqueueSummarise(fn) {
    return new Promise((resolve, reject) => {
        _summariseQueue.push({ resolve, reject, fn });
        _drainSummariseQueue();
    });
}

function _drainSummariseQueue() {
    while (_summariseActive < SUMMARISE_CONCURRENCY && _summariseQueue.length) {
        const { resolve, reject, fn } = _summariseQueue.shift();
        _summariseActive++;
        fn()
            .then(resolve)
            .catch(reject)
            .finally(() => { _summariseActive--; _drainSummariseQueue(); });
    }
}

async function groqSummariseWithRetry(payload, attempt = 0) {
    try {
        return await groq.chat.completions.create(payload);
    } catch (err) {
        const is429 = err?.status === 429 || err?.statusCode === 429;
        if (is429 && attempt < SUMMARISE_RETRY_MAX) {
            // Honour Retry-After header if present, else use exponential backoff
            const retryAfterMs = parseInt(err?.headers?.['retry-after'] || '0', 10) * 1000
                || SUMMARISE_RETRY_BASE * Math.pow(2, attempt);
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
app.post('/api/summarise', aiRateLimit, async (req, res) => {
    if (!groq) return res.status(503).json({ error: 'AI not configured. Set GROQ_API_KEY.' });
    const { fileName, folder, fileType } = req.body;
    if (!fileName) return res.status(400).json({ error: 'fileName required' });

    const ext = (fileName.split('.').pop() || '').toLowerCase();
    const typeMap = {
        pdf: 'PDF document', pptx: 'PowerPoint presentation', ppt: 'PowerPoint presentation',
        docx: 'Word document', doc: 'Word document',
        xlsx: 'Excel spreadsheet', csv: 'CSV data file',
        jpg: 'image', jpeg: 'image', png: 'image'
    };
    const friendlyType = typeMap[ext] || fileType || 'file';
    const folderHint = folder && folder !== 'Root' ? ` in the "${folder}" folder` : '';

    const groqPayload = {
        model: 'llama-3.1-8b-instant',
        max_tokens: 120,
        messages: [
            {
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
        res.json({ summary });
    } catch (error) {
        console.error('Summarise error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ── Expiry Notification Cron ─────────────────────────────────────────────────
// GET /api/cron/expiry-check  { secret }
// Checks files_list for files expiring in the next 24 hours and pushes a
// notification to all subscribers.  Call this from a Render cron job or any
// external scheduler once per day.
app.get('/api/cron/expiry-check', async (req, res) => {
    const secret = req.query.secret || req.headers['x-cron-secret'];
    if (process.env.PUSH_SECRET && secret !== process.env.PUSH_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!_supa) return res.status(503).json({ error: 'Supabase not configured' });
    if (!process.env.VAPID_PUBLIC_KEY) return res.status(503).json({ error: 'Push not configured' });

    try {
        const now = new Date();
        const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        const { data: expiring, error } = await _supa
            .from('files_list')
            .select('file_name, folder_name, expires_at')
            .gt('expires_at', now.toISOString())
            .lte('expires_at', in24h.toISOString());

        if (error) throw error;
        if (!expiring || expiring.length === 0) {
            return res.json({ ok: true, notified: 0, message: 'No files expiring in next 24h' });
        }

        // Group by folder for a compact notification body
        const byFolder = {};
        expiring.forEach(f => {
            const key = f.folder_name || 'Root';
            if (!byFolder[key]) byFolder[key] = [];
            byFolder[key].push(f.file_name);
        });

        const folderSummaries = Object.entries(byFolder)
            .map(([folder, files]) => `${files.length} file${files.length > 1 ? 's' : ''} in ${folder}`)
            .join(', ');

        const payload = JSON.stringify({
            title: '⏳ Files expiring soon!',
            body: `${folderSummaries} will be removed from the Vault within 24 hours. Download them now.`,
            url: '/index.html',
            icon: '/filevault%20logo.png',
            badge: '/filevault%20logo.png'
        });

        const allSubs = await dbGetAllSubs();
        let sent = 0, failed = 0;

        // Parallel sends — mirrors the fix in /api/push/notify
        const results = await Promise.allSettled(
            allSubs.map(subscription => webpush.sendNotification(subscription, payload))
        );
        await Promise.all(results.map(async (result, i) => {
            if (result.status === 'fulfilled') {
                sent++;
            } else {
                const code = result.reason?.statusCode;
                if (code === 410 || code === 404) {
                    await dbDeleteSub(allSubs[i].endpoint);
                }
                failed++;
            }
        }));

        console.log(`[Expiry cron] ${expiring.length} files expiring. Push sent=${sent} failed=${failed}`);
        res.json({ ok: true, filesExpiring: expiring.length, sent, failed });
    } catch (err) {
        console.error('[Expiry cron] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/chat', aiRateLimit, async (req, res) => {
    if (!groq) return res.status(503).json({ error: 'AI not configured. Set GROQ_API_KEY.' });
    try {
        const { message, history, systemPrompt } = req.body;

        // Strip ASCII control characters from the incoming message as defence-in-depth
        // against prompt-injection via adversarially named files or user input.
        // The client sanitizes quiz file data already; this catches anything that slips through.
        const cleanMessage = typeof message === 'string'
            ? message.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim()
            : '';
        if (!cleanMessage) return res.status(400).json({ error: 'message is required' });

        // Defensively extract text from history entries — m.parts[0].text throws
        // if parts is missing, empty, or a future client sends a different shape.
        const historyMessages = (history || []).flatMap(m => {
            const text = m?.content ?? m?.parts?.[0]?.text;
            if (typeof text !== 'string' || !text.trim()) return []; // skip malformed entries
            const role = m.role === 'model' ? 'assistant' : 'user';
            return [{ role, content: text }];
        });

        const messages = [
            { role: 'system', content: systemPrompt || '' },
            ...historyMessages,
            { role: 'user', content: message }
        ];

        const response = await groq.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            max_tokens: 1024,
            messages
        });

        res.json({ text: response.choices[0].message.content });
    } catch (error) {
        console.error('SERVER ERROR:', error);
        res.status(500).json({ error: error.message });
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
    if (!_supa) return res.status(503).json({ error: 'Supabase not configured' });
    const { data, error } = await _supa
        .from('announcements')
        .select('id, message, expires_at, created_at')
        .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ announcement: data || null });
});

app.post('/api/announcements', async (req, res) => {
    const { message, expires_at, created_by, secret } = req.body;
    if (process.env.PUSH_SECRET && secret !== process.env.PUSH_SECRET)
        return res.status(401).json({ error: 'Unauthorized' });
    if (!_supa) return res.status(503).json({ error: 'Supabase not configured' });
    if (!message || !message.trim())
        return res.status(400).json({ error: 'message is required' });

    // Validate expiry date if provided
    let expiresAt = null;
    if (expires_at) {
        expiresAt = new Date(expires_at);
        if (isNaN(expiresAt.getTime()) || expiresAt <= new Date())
            return res.status(400).json({ error: 'expires_at must be a future date' });
        expiresAt = expiresAt.toISOString();
    }

    const { data, error } = await _supa.from('announcements').insert({
        message: message.trim().slice(0, 500),
        expires_at: expiresAt,
        created_by: created_by || null
    }).select('id, message, expires_at, created_at').single();

    if (error) return res.status(500).json({ error: error.message });
    console.log(`[announcements] Created id=${data.id} expires=${expiresAt || 'never'}`);
    res.json({ ok: true, announcement: data });
});

app.delete('/api/announcements/:id', async (req, res) => {
    const { secret } = req.body;
    if (process.env.PUSH_SECRET && secret !== process.env.PUSH_SECRET)
        return res.status(401).json({ error: 'Unauthorized' });
    if (!_supa) return res.status(503).json({ error: 'Supabase not configured' });
    const { error } = await _supa.from('announcements').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
});

// ── Cron: prune expired announcements ────────────────────────────────────────
// Call from the same Render cron job as /api/cron/expiry-check
app.get('/api/cron/announcement-cleanup', async (req, res) => {
    const secret = req.query.secret || req.headers['x-cron-secret'];
    if (process.env.PUSH_SECRET && secret !== process.env.PUSH_SECRET)
        return res.status(401).json({ error: 'Unauthorized' });
    if (!_supa) return res.status(503).json({ error: 'Supabase not configured' });
    const { error, count } = await _supa
        .from('announcements')
        .delete({ count: 'exact' })
        .lt('expires_at', new Date().toISOString());
    if (error) return res.status(500).json({ error: error.message });
    console.log(`[announcement-cleanup] Pruned ${count} expired announcements`);
    res.json({ ok: true, pruned: count || 0 });
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

// GET /api/file-requests
// Manager listing: pass secret in X-Manager-Secret header.
app.get('/api/file-requests', async (req, res) => {
    if (!_supa) return res.status(503).json({ error: 'Supabase not configured' });

    // Prefer header; fall back to query param with a deprecation warning
    const secret = req.headers['x-manager-secret'] || req.query.secret;
    if (req.query.secret && !req.headers['x-manager-secret']) {
        console.warn('[file-requests] secret passed as query param — move to X-Manager-Secret header to keep it out of access logs');
    }

    if (!secret || !process.env.PUSH_SECRET || secret !== process.env.PUSH_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data, error } = await _supa
        .from('upload_requests')
        .select('id, filename, description, reason, folder, status, requester_name, requester_email, manager_note, created_at')
        .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ requests: data || [] });
});

// PATCH /api/file-requests/:id  { status, manager_note, secret }
// Manager updates a request status (fulfilled | dismissed) and optional note.
app.patch('/api/file-requests/:id', async (req, res) => {
    const { status, manager_note, secret } = req.body;
    if (process.env.PUSH_SECRET && secret !== process.env.PUSH_SECRET)
        return res.status(401).json({ error: 'Unauthorized' });
    if (!_supa) return res.status(503).json({ error: 'Supabase not configured' });
    const allowed = ['pending', 'fulfilled', 'dismissed'];
    if (status && !allowed.includes(status))
        return res.status(400).json({ error: 'status must be pending, fulfilled, or dismissed' });

    const updates = {};
    if (status) updates.status = status;
    if (typeof manager_note === 'string') updates.manager_note = manager_note.trim().slice(0, 500);

    if (!Object.keys(updates).length)
        return res.status(400).json({ error: 'Nothing to update' });

    const { data, error } = await _supa
        .from('upload_requests').update(updates).eq('id', req.params.id)
        .select('id, status, manager_note').single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true, request: data });
});

app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// ── Global error handler ─────────────────────────────────────────────────────
// Catches any error passed to next(err) or thrown synchronously in a route.
// Prevents Express from leaking stack traces to clients in production.
app.use((err, req, res, _next) => {
    console.error('[global error handler]', err);
    res.status(500).json({ error: 'Internal server error' });
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