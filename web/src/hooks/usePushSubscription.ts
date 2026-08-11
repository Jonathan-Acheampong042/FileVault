import { useCallback, useEffect, useState } from 'react'
import { API_BASE } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i)
  return output.buffer
}

/**
 * Talks to the SAME /api/push/* routes as the original app
 * (see server.js: /api/push/vapid-public-key, /api/push/subscribe, /api/push/unsubscribe).
 * No backend changes needed if VITE_API_BASE points at your existing Render service.
 */
export function usePushSubscription() {
  const { session } = useAuth()
  const showToast = useToast()
  const [supported] = useState('serviceWorker' in navigator && 'PushManager' in window)
  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)

  // Reflect existing subscription state on load
  useEffect(() => {
    if (!supported) return
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => {})
  }, [supported])

  const subscribe = useCallback(async () => {
    if (!supported) {
      showToast("Push notifications aren't supported in this browser.", 'warning')
      return
    }
    setBusy(true)
    try {
      const keyRes = await fetch(`${API_BASE}/api/push/vapid-public-key`)
      const { key } = await keyRes.json()
      if (!key || key === 'none') {
        showToast('Push notifications are not configured on the server yet.', 'warning')
        return
      }
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') {
        showToast('Notification permission denied.', 'warning')
        return
      }
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      })
      await fetch(`${API_BASE}/api/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), userId: session?.user.id ?? null }),
      })
      setSubscribed(true)
      showToast('🔔 Push notifications enabled!', 'success')
    } catch (err) {
      showToast(`Push setup failed: ${err instanceof Error ? err.message : 'unknown error'}`, 'error')
    } finally {
      setBusy(false)
    }
  }, [supported, session, showToast])

  const unsubscribe = useCallback(async () => {
    if (!supported) return
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      const sub = reg ? await reg.pushManager.getSubscription() : null
      if (sub) {
        await fetch(`${API_BASE}/api/push/unsubscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setSubscribed(false)
      showToast('Push notifications disabled.', 'info')
    } finally {
      setBusy(false)
    }
  }, [supported, showToast])

  const toggle = useCallback(() => {
    if (subscribed) unsubscribe()
    else subscribe()
  }, [subscribed, subscribe, unsubscribe])

  return { supported, subscribed, busy, toggle }
}
