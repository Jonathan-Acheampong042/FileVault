import { useEffect } from 'react'

/**
 * Registers the service worker at /public/sw.js. Kept minimal on purpose —
 * it only handles Web Push display + notification clicks (see sw.js comments).
 * For offline asset caching / full PWA support, layer in `vite-plugin-pwa`
 * separately; that's a distinct concern from push notifications.
 */
export function useServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Non-fatal — push subscription attempts will surface a clearer error.
    })
  }, [])
}
