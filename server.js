require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');
const webpush = require('web-push');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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
    const { data } = await _supa.from('push_subscriptions').select('subscription').eq('endpoint', endpoint).single();
    return data ? data.subscription : null;
}
async function dbSaveSub(subscription) {
    if (!_supa) return;
    await _supa.from('push_subscriptions').upsert(
        { endpoint: subscription.endpoint, subscription },
        { onConflict: 'endpoint' }
    );
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
    await dbSaveSub(subscription);
    res.json({ ok: true, message: 'Subscribed to push notifications.' });
});

app.post('/api/push/unsubscribe', async (req, res) => {
    const { endpoint } = req.body;
    await dbDeleteSub(endpoint);
    res.json({ ok: true });
});

// Notify all subscribers — called by manager on new file upload or announcement
app.post('/api/push/notify', async (req, res) => {
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
    for (const subscription of allSubs) {
        try {
            await webpush.sendNotification(subscription, payload);
            sent++;
        } catch (err) {
            if (err.statusCode === 410 || err.statusCode === 404) {
                await dbDeleteSub(subscription.endpoint); // expired — clean up
            }
            failed++;
        }
    }
    res.json({ ok: true, sent, failed, total: allSubs.length });
});

// Notify a single subscriber by endpoint — used when manager approves a request
app.post('/api/push/notify-one', async (req, res) => {
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

// ── AI File Summary ─────────────────────────────────────────────────────────
// POST /api/summarise  { fileName, folder, fileType }
// Returns { summary: "…" }  — a short 2-3 sentence description for the file.
// Called by manager.html right after a successful upload for PDF/PPTX/DOCX/XLSX files.
app.post('/api/summarise', async (req, res) => {
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

    try {
        const response = await groq.chat.completions.create({
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
        });
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
        for (const subscription of allSubs) {
            try {
                await webpush.sendNotification(subscription, payload);
                sent++;
            } catch (err) {
                if (err.statusCode === 410 || err.statusCode === 404) {
                    await dbDeleteSub(subscription.endpoint);
                }
                failed++;
            }
        }

        console.log(`[Expiry cron] ${expiring.length} files expiring. Push sent=${sent} failed=${failed}`);
        res.json({ ok: true, filesExpiring: expiring.length, sent, failed });
    } catch (err) {
        console.error('[Expiry cron] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/chat', async (req, res) => {
    try {
        const { message, history, systemPrompt } = req.body;

        const messages = [
            { role: 'system', content: systemPrompt },
            ...(history || []).map(m => ({
                role: m.role === 'model' ? 'assistant' : 'user',
                content: m.parts[0].text
            })),
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

app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
        console.warn('\n⚠️  PUSH NOTIFICATIONS DISABLED: VAPID keys not set.');
        console.warn('   Run: npx web-push generate-vapid-keys');
        console.warn('   Then add VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to your environment.\n');
    }
});