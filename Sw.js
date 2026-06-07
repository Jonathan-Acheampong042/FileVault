// FileVault Service Worker — v1
// Caches core shell assets for offline access

const CACHE_NAME = 'filevault-v1';

// Core assets to cache on install
const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/login.html',
    '/filevault%20logo.png',
    '/screen.png',
    '/chat-widget.js'
];

// ── Install: pre-cache shell ──
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            // Use individual adds so one failure doesn't block the rest
            return Promise.allSettled(
                PRECACHE_URLS.map(url => cache.add(url).catch(() => {}))
            );
        }).then(() => self.skipWaiting())
    );
});

// ── Activate: clean up old caches ──
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

// ── Fetch: network-first for API/Supabase, cache-first for assets ──
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Always go network-first for Supabase API calls and CDN scripts
    const isExternal = url.hostname !== self.location.hostname;
    if (isExternal || event.request.method !== 'GET') {
        event.respondWith(
            fetch(event.request).catch(() =>
                caches.match(event.request)
            )
        );
        return;
    }

    // Cache-first for local assets (HTML, images, JS)
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(response => {
                // Cache successful responses for local assets
                if (response && response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            }).catch(() => {
                // Fallback to index.html for navigation requests
                if (event.request.mode === 'navigate') {
                    return caches.match('/index.html');
                }
            });
        })
    );
});