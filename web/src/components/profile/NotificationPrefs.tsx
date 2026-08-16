import { useState, useEffect } from 'react'
import { useToast } from '../../context/ToastContext'
import { supabase } from '../../lib/supabase'

interface NotifPrefs {
  newFiles: boolean
  expiry: boolean
  requests: boolean
}

export default function NotificationPrefs() {
  const showToast = useToast()
  const [pushSupported, setPushSupported] = useState(true)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [prefs, setPrefs] = useState<NotifPrefs>({
    newFiles: false,
    expiry: false,
    requests: false
  })

  useEffect(() => {
    // Check if push is supported
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushSupported(false)
    } else {
      // Check current subscription status
      navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.getSubscription().then(sub => {
          setPushEnabled(!!sub)
        })
      })
    }

    // Load local prefs
    try {
      const saved = JSON.parse(localStorage.getItem('fvNotifPrefs') || '{}')
      setPrefs({
        newFiles: saved.newFiles ?? false,
        expiry: saved.expiry ?? false,
        requests: saved.requests ?? false
      })
    } catch (_) {}
  }, [])

  async function togglePush(enabled: boolean) {
    if (!enabled) {
      try {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (sub) await sub.unsubscribe()
        setPushEnabled(false)
        showToast('Push notifications disabled', 'info')
      } catch (e: any) {
        showToast('Error disabling push: ' + e.message, 'error')
      }
      return
    }

    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        showToast('Notification permission denied', 'error')
        setPushEnabled(false)
        return
      }

      const apiHost = import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? 'http://localhost:3000' : 'https://project-one-187u.onrender.com');
      const keyRes = await fetch(`${apiHost}/api/push/vapid-public-key`);
      const { key: publicVapidKey } = await keyRes.json();
      
      if (!publicVapidKey) throw new Error('Push not configured on server');

      const urlBase64ToUint8Array = (base64String: string) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
      };

      const reg = await navigator.serviceWorker.ready
      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
        });
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      
      await fetch(`${apiHost}/api/push/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          subscription: sub,
          userId: session?.user?.id,
          role: 'student'
        })
      });

      setPushEnabled(true)
      showToast('Push notifications enabled', 'success')
    } catch (e: any) {
      showToast('Error enabling push: ' + e.message, 'error')
      setPushEnabled(false)
    }
  }

  function handlePrefChange(key: keyof NotifPrefs, value: boolean) {
    const next = { ...prefs, [key]: value }
    setPrefs(next)
    localStorage.setItem('fvNotifPrefs', JSON.stringify(next))
  }

  return (
    <div className="section-card border border-white/5 bg-white/[0.03] p-5 rounded-[1.1rem]">
      <div className="mb-3.5 flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-wider text-slate-100">
        <span className="material-symbols-outlined text-[18px] text-blue-400">notifications</span>
        Notification Preferences
      </div>

      <div className="space-y-1">
        <ToggleRow 
          label="Push Notifications"
          sub="Get alerts on this device, even when FileVault is closed"
          checked={pushEnabled}
          onChange={togglePush}
          disabled={!pushSupported}
        />
        {!pushSupported && (
          <p className="mb-2 text-[11px] text-slate-500">Push notifications aren't supported in this browser.</p>
        )}

        <ToggleRow 
          label="New file alerts"
          sub="Notify me when new files are uploaded"
          checked={prefs.newFiles}
          onChange={(v) => handlePrefChange('newFiles', v)}
        />
        <ToggleRow 
          label="Expiry reminders"
          sub="Alert before files are removed from the Vault"
          checked={prefs.expiry}
          onChange={(v) => handlePrefChange('expiry', v)}
        />
        <ToggleRow 
          label="Request fulfilled"
          sub="Notify me when my file request is uploaded"
          checked={prefs.requests}
          onChange={(v) => handlePrefChange('requests', v)}
        />
      </div>
    </div>
  )
}

function ToggleRow({ label, sub, checked, onChange, disabled }: { label: string, sub: string, checked: boolean, onChange: (v: boolean) => void, disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.05] py-2.5 last:border-b-0">
      <div className={disabled ? 'opacity-50' : ''}>
        <p className="text-[13px] font-bold text-slate-200">{label}</p>
        <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p>
      </div>
      <label className={`relative h-6 w-[42px] shrink-0 cursor-pointer ${disabled ? 'pointer-events-none opacity-50' : ''}`}>
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className="absolute inset-0 rounded-full bg-white/10 transition-colors peer-checked:bg-blue-500"></div>
        <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-slate-300 transition-all peer-checked:translate-x-[18px] peer-checked:bg-white"></div>
      </label>
    </div>
  )
}
