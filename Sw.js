// FileVault Service Worker — v2
// HTML pages always fetched fresh; static assets cached for speed

// ── How cache invalidation works ────────────────────────────────────────────
//
// TWO-PART cache name:  filevault-<urlHash>-v<ASSET_VERSION>
//
// Part 1 — URL hash (automatic):
//   Computed from the list of URLs in PRECACHE_URLS below. Adding, removing,
//   or renaming any entry produces a new hash → new cache name → old cache
//   evicted on activate. You don't need to touch anything by hand for this.
//
// Part 2 — ASSET_VERSION (manual):
//   Bump this number whenever you update a precached FILE's CONTENTS without
//   changing its URL (e.g. redesigning screen.png, updating the logo).
//   The URL hash alone won't change in that case because the list of URLs
//   stays the same — only ASSET_VERSION forces a new cache name.
//
//   Examples:
//     Updated filevault%20logo.png on disk? Bump ASSET_VERSION.
//     Replaced screen.png with a new screenshot? Bump ASSET_VERSION.
//     Added a brand-new file to PRECACHE_URLS? URL hash handles it automatically.
//     Removed a file from PRECACHE_URLS? URL hash handles it automatically.
//
// chat-widget.js is intentionally excluded from PRECACHE_URLS and is served
// network-first (see fetch handler below), so its on-disk changes are always
// picked up on the next online request regardless of either value.
const ASSET_VERSION = 1; // ← bump this when precached file contents change

const PRECACHE_URLS = [
    '/index.html',            // offline fallback page — must be cached on install
    '/filevault%20logo.png',
    '/screen.png'
    // chat-widget.js is intentionally excluded from precache: it changes
    // frequently and must always be fetched fresh. The fetch handler below
    // uses a network-first strategy for it so stale JS is never served.
];

// Simple djb2 hash → 8-char hex string, stable across SW restarts.
const _cacheHash = (function(urls) {
    let h = 5381;
    for (const s of urls) for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
    return (h >>> 0).toString(16).padStart(8, '0');
})(PRECACHE_URLS);

const CACHE_NAME = 'filevault-' + _cacheHash + '-v' + ASSET_VERSION;

// ── Install: pre-cache static assets only ──
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return Promise.allSettled(
                PRECACHE_URLS.map(url => cache.add(url).catch(() => {}))
            );
        }).then(() => {
            // Only skip the waiting phase (and take over immediately) if there
            // are no currently-controlled clients. If open tabs exist, let the
            // old SW keep running until all those tabs are closed or refreshed —
            // this prevents a new SW with a different cache from serving assets
            // to a page that was loaded under the previous SW, which could break
            // active Supabase realtime subscriptions or in-flight uploads.
            //
            // Tabs that were opened before any SW was registered have
            // self.clients.matchAll returning an empty list, so a brand-new
            // installation (first visit) still activates immediately as expected.
            return self.clients.matchAll({ type: 'window', includeUncontrolled: false })
                .then(clients => {
                    if (clients.length === 0) self.skipWaiting();
                    // If clients exist, the SW sits in 'waiting' until all tabs
                    // are closed/refreshed. The page can optionally listen for
                    // the 'waiting' state via navigator.serviceWorker and show
                    // a "reload to update" prompt to the user.
                });
        })
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

// ── Update banner support: let the page ask a waiting SW to activate now ──
// index.html's update banner posts { type: 'SKIP_WAITING' } when the user
// clicks "Reload to update". Without this listener, a waiting SW (see the
// install handler above) only ever activates once every controlled tab has
// been closed or refreshed on its own — this lets the user opt in sooner
// instead of waiting on that.
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// ── Push Notifications ──
self.addEventListener('push', event => {
    let data = { title: 'FileVault', body: 'New files available!', url: '/', icon: '/filevault%20logo.png', badge: '/filevault%20logo.png' };
    try { if (event.data) data = { ...data, ...event.data.json() }; } catch(e) {}
    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: data.icon,
            badge: data.badge,
            tag: 'filevault-push',
            renotify: true,
            data: { url: data.url }
        })
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    const url = (event.notification.data && event.notification.data.url) || '/';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
            for (const client of list) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.navigate(url);
                    return client.focus();
                }
            }
            if (clients.openWindow) return clients.openWindow(url);
        })
    );
});
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // 1. Skip non-GET and external requests (Supabase, CDNs, Render API).
    //    The Cache API only stores GET responses, so there is no cache
    //    fallback for these — just let the network failure propagate so the
    //    page can surface a real error to the user.
    const isExternal = url.hostname !== self.location.hostname;
    if (isExternal || event.request.method !== 'GET') {
        return; // fall through to browser default (network only)
    }

    // 2. Always fetch HTML pages fresh from the network
    //    so users always get your latest updates immediately
    if (event.request.destination === 'document') {
        event.respondWith(
            fetch(event.request).catch(() => {
                // Offline fallback — serve cached index.html if network is down.
                // INVARIANT: '/index.html' MUST remain in PRECACHE_URLS above.
                // If it is removed, this fallback silently returns undefined and
                // the browser shows a generic network-error page instead of the
                // offline shell. The periodicsync handler also refreshes this
                // entry every ~12 hours so the cached copy stays reasonably current.
                return caches.match('/index.html');
            })
        );
        return;
    }

    // 3. Network-first for chat-widget.js — it changes frequently and must
    //    never be served stale. Falls back to cache only if truly offline.
    if (url.pathname.endsWith('/chat-widget.js')) {
        event.respondWith(
            fetch(event.request).then(response => {
                if (response && response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            }).catch(() => caches.match(event.request))
        );
        return;
    }

    // 4. Cache-first for static assets (images, JS, CSS, fonts)
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(response => {
                if (response && response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            }).catch(() => null);
        })
    );
});

// ── Feature 4: Background Sync — flush queued chat messages ──
// When the chat widget queues a message offline, it also registers a
// 'chat-message-sync' sync tag. The SW fires this event when connectivity
// is confirmed (more reliable than window.online in some browsers).
// The widget's own _watchForReconnect() handles the actual retry logic;
// this just posts a message to all open clients so they can flush immediately.
self.addEventListener('sync', event => {
    if (event.tag === 'chat-message-sync') {
        event.waitUntil(
            self.clients.matchAll({ type: 'window', includeUncontrolled: false }).then(clients => {
                clients.forEach(client => client.postMessage({ type: 'SW_SYNC_CHAT' }));
            })
        );
    }
});

// ── Feature 5: Periodic Background Sync — pre-warm cache ──
// Registered by the page as 'cache-prewarm' (min-interval: 12 hours).
// Fetches index.html silently so the offline fallback is always the latest
// published version, not a copy from the user's first-ever visit.
// The SW cannot reach Supabase (external hostname) so file metadata is
// intentionally not pre-fetched here — that would require a same-origin proxy.
self.addEventListener('periodicsync', event => {
    if (event.tag === 'cache-prewarm') {
        event.waitUntil(
            fetch('/index.html', { cache: 'no-store' }).then(response => {
                if (response && response.status === 200) {
                    return caches.open(CACHE_NAME).then(cache => cache.put('/index.html', response));
                }
            }).catch(() => { /* network unavailable — skip silently */ })
        );
    }
});