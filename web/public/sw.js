// FileVault React — minimal service worker.
//
// Scope is intentionally narrow: this only handles Web Push notifications
// (the `push` and `notificationclick` events below). It does NOT do asset
// caching or offline fallback — that's a separate concern. If you want full
// PWA/offline support later, layer in `vite-plugin-pwa` (it generates its
// own service worker with a `precacheAndRoute` call); you can merge that
// generated worker with the push handlers here, or run them as two workers
// if your setup allows it.

self.addEventListener('push', (event) => {
  let data = {
    title: 'FileVault',
    body: 'New activity in your vault.',
    url: '/',
    icon: '/filevault-logo.png',
    badge: '/filevault-logo.png',
  }
  try {
    if (event.data) data = { ...data, ...event.data.json() }
  } catch {
    // malformed payload — fall back to defaults above
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      tag: 'filevault-push',
      renotify: true,
      data: { url: data.url },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
