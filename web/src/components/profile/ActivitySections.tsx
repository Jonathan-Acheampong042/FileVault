import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { Link } from 'react-router-dom'

export default function ActivitySections() {
  const { user } = useAuth()
  const showToast = useToast()

  const [notifications, setNotifications] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [downloads, setDownloads] = useState<any[]>([])
  const [pins, setPins] = useState<any[]>([])
  
  const [loadingExport, setLoadingExport] = useState(false)

  useEffect(() => {
    if (user) {
      loadNotifications()
      loadRequests()
      loadDownloads()
      loadPins()
      
      const refreshDownloads = () => loadDownloads()
      const refreshPins = () => loadPins()
      
      window.addEventListener('refresh_downloads', refreshDownloads)
      window.addEventListener('refresh_pins', refreshPins)
      
      return () => {
        window.removeEventListener('refresh_downloads', refreshDownloads)
        window.removeEventListener('refresh_pins', refreshPins)
      }
    }
  }, [user])

  async function loadNotifications() {
    if (!user) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (data) setNotifications(data)
  }

  async function loadRequests() {
    if (!user) return
    const { data } = await supabase
      .from('upload_requests')
      .select('id, filename, status, created_at')
      .eq('requester_email', user.email)
      .order('created_at', { ascending: false })
      .limit(5)
      
    if (data) setRequests(data)
  }

  async function loadDownloads() {
    if (!user) return
    const { data } = await supabase
      .from('user_downloads')
      .select('file_name, file_url, file_folder, downloaded_at')
      .eq('user_id', user.id)
      .order('downloaded_at', { ascending: false })
      .limit(5)
      
    if (data) setDownloads(data)
  }

  function loadPins() {
    try {
      const saved = JSON.parse(localStorage.getItem('fvBookmarks') || '[]')
      setPins(saved.slice(0, 5))
    } catch (_) {
      setPins([])
    }
  }

  async function markAllNotificationsRead() {
    if (!user) return
    const unread = notifications.filter(n => !n.read)
    if (!unread.length) return
    
    setNotifications(notifications.map(n => ({ ...n, read: true })))
    await supabase.from('notifications').update({ read: true }).in('id', unread.map(u => u.id))
  }

  async function exportData() {
    if (!user) return
    setLoadingExport(true)
    showToast('Preparing data export...', 'info')
    
    try {
      const [requestsRes, downloadsRes, notifsRes] = await Promise.allSettled([
        supabase.from('upload_requests').select('*').eq('requester_email', user.email),
        supabase.from('user_downloads').select('*').eq('user_id', user.id),
        supabase.from('notifications').select('*').eq('user_id', user.id),
      ])
      
      const exportObj = {
        exported_at: new Date().toISOString(),
        profile: user,
        file_requests: requestsRes.status === 'fulfilled' ? requestsRes.value.data : [],
        download_history: downloadsRes.status === 'fulfilled' ? downloadsRes.value.data : [],
        notifications: notifsRes.status === 'fulfilled' ? notifsRes.value.data : [],
        pinned_files: pins
      }
      
      const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `filevault-data-export-${new Date().toISOString().slice(0,10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      showToast('Your data export has started downloading', 'success')
    } catch (e: any) {
      showToast('Export failed: ' + e.message, 'error')
    } finally {
      setLoadingExport(false)
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="space-y-5">
      {/* Notifications */}
      <div className="section-card border border-white/5 bg-white/[0.03] p-5 rounded-[1.1rem]">
        <div className="mb-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-wider text-slate-100">
            <span className="material-symbols-outlined text-[18px] text-blue-400">mark_email_unread</span>
            Notifications
            {unreadCount > 0 && (
              <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-400">
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllNotificationsRead} className="text-[11px] font-bold text-slate-400 hover:text-white">
              Mark all read
            </button>
          )}
        </div>
        
        {notifications.length === 0 ? (
          <EmptyState icon="notifications" title="No notifications yet" sub="Approvals, expiry reminders, and announcements will show up here." />
        ) : (
          <div className="space-y-2">
            {notifications.map(n => (
              <div key={n.id} className={`rounded-xl border border-white/5 p-3 ${!n.read ? 'bg-white/5' : 'bg-transparent'}`}>
                <p className="text-[13px] font-bold text-slate-200">{n.title}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-slate-400">{n.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Requests */}
      <div className="section-card border border-white/5 bg-white/[0.03] p-5 rounded-[1.1rem]">
        <div className="mb-3.5 flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-wider text-slate-100">
          <span className="material-symbols-outlined text-[18px] text-blue-400">history</span>
          My File Requests
        </div>
        
        {requests.length === 0 ? (
          <EmptyState icon="inbox" title="No requests yet" sub="File requests you submit will be tracked here." />
        ) : (
          <div className="space-y-2">
            {requests.map(r => (
              <div key={r.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <div>
                  <p className="text-[13px] font-bold text-slate-200">{r.filename}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">{new Date(r.created_at).toLocaleDateString()}</p>
                </div>
                <span className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase ${
                  r.status === 'fulfilled' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                  r.status === 'rejected' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                  'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        )}
        <Link to="/request" className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 py-2.5 text-[12px] font-bold text-slate-300 transition-colors hover:bg-white/10">
          <span className="material-symbols-outlined text-[16px]">add_circle</span> Make a New Request
        </Link>
      </div>

      {/* Downloads */}
      <div className="section-card border border-white/5 bg-white/[0.03] p-5 rounded-[1.1rem]">
        <div className="mb-3.5 flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-wider text-slate-100">
          <span className="material-symbols-outlined text-[18px] text-blue-400">download_done</span>
          Recently Downloaded
        </div>
        
        {downloads.length === 0 ? (
          <EmptyState icon="download" title="No downloads yet" sub="Files you download from the Vault will appear here." />
        ) : (
          <div className="space-y-2">
            {downloads.map((d, i) => (
              <a key={i} href={d.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 transition-colors hover:bg-white/[0.05]">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                  <span className="material-symbols-outlined text-[18px]">insert_drive_file</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold text-slate-200">{d.file_name}</p>
                  <p className="truncate text-[11px] text-slate-500">
                    {d.file_folder && `${d.file_folder} • `}
                    {new Date(d.downloaded_at).toLocaleDateString()}
                  </p>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Pins */}
      <div className="section-card border border-white/5 bg-white/[0.03] p-5 rounded-[1.1rem]">
        <div className="mb-3.5 flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-wider text-slate-100">
          <span className="material-symbols-outlined text-[18px] text-blue-400">push_pin</span>
          Pinned Files
        </div>
        
        {pins.length === 0 ? (
          <EmptyState icon="push_pin" title="No pinned files" sub="Pin files on the Vault to bookmark them here." />
        ) : (
          <div className="space-y-2">
            {pins.map((p, i) => (
              <a key={i} href={p.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 transition-colors hover:bg-white/[0.05]">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                  <span className="material-symbols-outlined text-[18px]">push_pin</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold text-slate-200">{p.name}</p>
                  <p className="truncate text-[11px] text-slate-500">{p.folder}</p>
                </div>
              </a>
            ))}
          </div>
        )}
        <Link to="/" className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 py-2.5 text-[12px] font-bold text-slate-300 transition-colors hover:bg-white/10">
          <span className="material-symbols-outlined text-[16px]">open_in_new</span> Browse the Vault
        </Link>
      </div>

      {/* Export Data */}
      <div className="section-card border border-white/5 bg-white/[0.03] p-5 rounded-[1.1rem]">
        <div className="mb-3.5 flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-wider text-slate-100">
          <span className="material-symbols-outlined text-[18px] text-blue-400">file_download</span>
          Export My Data
        </div>
        <p className="mb-3 text-[12px] leading-relaxed text-slate-500">
          Download a copy of your FileVault data — profile details, file requests, download history, notifications, and saved preferences — as a JSON file.
        </p>
        <button
          onClick={exportData}
          disabled={loadingExport}
          className="flex w-full items-center justify-center gap-2 rounded-[13px] border border-white/10 bg-white/5 py-3 text-[13px] font-bold text-slate-200 transition-colors hover:bg-white/10 disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[16px]">download_for_offline</span>
          {loadingExport ? 'Preparing...' : 'Download My Data'}
        </button>
      </div>
    </div>
  )
}

function EmptyState({ icon, title, sub }: { icon: string, title: string, sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-6 text-center">
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-slate-500">
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </div>
      <p className="text-[13px] font-bold text-slate-300">{title}</p>
      <p className="mt-1 max-w-[200px] text-[11px] text-slate-500">{sub}</p>
    </div>
  )
}
