require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');
const webpush = require('web-push');

const app = express();
app.use(cors());
app.use(express.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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

// In-memory subscription store (replace with Supabase for persistence)
const pushSubscriptions = new Map();

app.get('/api/push/vapid-public-key', (req, res) => {
    res.json({ key: process.env.VAPID_PUBLIC_KEY || null });
});

app.post('/api/push/subscribe', (req, res) => {
    const { subscription, userId } = req.body;
    if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ error: 'Invalid subscription' });
    }
    const key = userId || subscription.endpoint;
    pushSubscriptions.set(key, subscription);
    res.json({ ok: true, message: 'Subscribed to push notifications.' });
});

app.post('/api/push/unsubscribe', (req, res) => {
    const { endpoint } = req.body;
    for (const [k, sub] of pushSubscriptions) {
        if (sub.endpoint === endpoint) { pushSubscriptions.delete(k); break; }
    }
    res.json({ ok: true });
});

// Notify all subscribers — call this from manager or a webhook
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
    let sent = 0, failed = 0;
    for (const [key, subscription] of pushSubscriptions) {
        try {
            await webpush.sendNotification(subscription, payload);
            sent++;
        } catch (err) {
            if (err.statusCode === 410 || err.statusCode === 404) {
                pushSubscriptions.delete(key); // expired
            }
            failed++;
        }
    }
    res.json({ ok: true, sent, failed, total: pushSubscriptions.size });
});

// Notify a single subscriber by endpoint — used when manager approves a request
app.post('/api/push/notify-one', async (req, res) => {
    const { endpoint, title, body, url } = req.body;
    if (!endpoint) return res.status(400).json({ error: 'endpoint required' });
    if (!process.env.VAPID_PUBLIC_KEY) {
        return res.status(503).json({ error: 'Push not configured' });
    }
    // Find the matching subscription in our in-memory store
    let targetSub = null;
    for (const [, sub] of pushSubscriptions) {
        if (sub.endpoint === endpoint) { targetSub = sub; break; }
    }
    if (!targetSub) {
        // Endpoint registered via upload-request.html without subscribing through the main page
        // Reconstruct a minimal subscription object (keys supplied by client)
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
            for (const [k, sub] of pushSubscriptions) {
                if (sub.endpoint === endpoint) { pushSubscriptions.delete(k); break; }
            }
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