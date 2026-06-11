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
        'mailto:acheampongjonathan21@gmail.com',
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