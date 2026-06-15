// FileVault Service Worker — v2
// HTML pages always fetched fresh; static assets cached for speed

const CACHE_NAME = 'filevault-v3';

// Only cache static assets — NO HTML files
const PRECACHE_URLS = [
    '/filevault%20logo.png',
    '/screen.png',
    '/chat-widget.js'
];

// ── Install: pre-cache static assets only ──
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
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

    // 1. Skip non-GET and external requests (Supabase, CDNs, Render API)
    const isExternal = url.hostname !== self.location.hostname;
    if (isExternal || event.request.method !== 'GET') {
        event.respondWith(
            fetch(event.request).catch(() =>
                caches.match(event.request)
            )
        );
        return;
    }

    // 2. Always fetch HTML pages fresh from the network
    //    so users always get your latest updates immediately
    if (event.request.destination === 'document') {
        event.respondWith(
            fetch(event.request).catch(() => {
                // Offline fallback — serve cached index.html if network is down
                return caches.match('/index.html');
            })
        );
        return;
    }

    // 3. Cache-first for static assets (images, JS, CSS, fonts)
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