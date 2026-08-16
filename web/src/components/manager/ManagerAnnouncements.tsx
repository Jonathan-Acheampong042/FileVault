import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'
import { logAudit } from '../../utils/audit'

interface Announcement {
  id: string
  message: string
  event_date?: string
  expires_at?: string
  status: 'draft' | 'published'
  created_at: string
}

export default function ManagerAnnouncements() {
  const showToast = useToast()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(false)
  const [listLoading, setListLoading] = useState(true)

  // Form states
  const [message, setMessage] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [status, setStatus] = useState<'published' | 'draft'>('published')

  useEffect(() => {
    loadAnnouncements()
  }, [])

  async function loadAnnouncements() {
    setListLoading(true)
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setAnnouncements(data || [])
    } catch (e: any) {
      console.error(e)
      showToast('Failed to load announcements.', 'error')
    } finally {
      setListLoading(false)
    }
  }

  async function broadcastAnnouncement(msg: string) {
    const session = (await supabase.auth.getSession()).data.session
    const apiHost = import.meta.env.DEV ? 'http://localhost:3000' : 'https://project-one-187u.onrender.com'

    // Inbox Notification with Backoff retry
    const triggerInboxNotif = async (retryCount = 0) => {
      const delays = [0, 15000, 30000]
      const delay = delays[retryCount] ?? 0
      setTimeout(async () => {
        try {
          const res = await fetch(`${apiHost}/api/notify-announcement`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token}`
            },
            body: JSON.stringify({ message: msg })
          })
          if (!res.ok) throw new Error()
        } catch {
          if (retryCount + 1 < delays.length) {
            triggerInboxNotif(retryCount + 1)
          }
        }
      }, delay)
    }

    // Push Broadcast with Backoff retry
    const triggerPushBroadcast = async (retryCount = 0) => {
      const delays = [0, 15000, 30000]
      const delay = delays[retryCount] ?? 0
      setTimeout(async () => {
        try {
          const res = await fetch(`${apiHost}/api/push/notify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token}`
            },
            body: JSON.stringify({
              title: '📢 New Announcement',
              body: msg.length > 80 ? `${msg.substring(0, 77)}…` : msg,
              url: '/'
            })
          })
          if (!res.ok) throw new Error()
          const data = await res.json()
          if (data && data.sent > 0) {
            showToast(`Notified ${data.sent} student(s) via push.`, 'success')
          }
        } catch {
          if (retryCount + 1 < delays.length) {
            triggerPushBroadcast(retryCount + 1)
          }
        }
      }, delay)
    }

    triggerInboxNotif()
    triggerPushBroadcast()
  }

  async function handlePost() {
    if (!message.trim()) {
      showToast('Announcement message cannot be empty.', 'warning')
      return
    }

    setLoading(true)
    try {
      const payload: any = {
        message: message.trim(),
        status
      }

      if (eventDate) payload.event_date = new Date(eventDate).toISOString()
      if (expiresAt) payload.expires_at = new Date(expiresAt).toISOString()

      const { error } = await supabase.from('announcements').insert(payload)
      if (error) throw error

      showToast(status === 'published' ? 'Announcement posted!' : 'Saved as draft.', 'success')
      logAudit('upload', `announcement (${status})`, null, { status })

      if (status === 'published') {
        broadcastAnnouncement(message.trim())
      }

      setMessage('')
      setEventDate('')
      setExpiresAt('')
      setStatus('published')
      loadAnnouncements()
    } catch (e: any) {
      console.error(e)
      showToast('Failed to post announcement: ' + e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handlePublish(ann: Announcement) {
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ status: 'published' })
        .eq('id', ann.id)

      if (error) throw error
      showToast('Announcement published!', 'success')
      logAudit('edit', 'published announcement', null, { id: ann.id })
      broadcastAnnouncement(ann.message)
      loadAnnouncements()
    } catch (e: any) {
      console.error(e)
      showToast('Failed to publish: ' + e.message, 'error')
    }
  }

  async function handleUnpublish(ann: Announcement) {
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ status: 'draft' })
        .eq('id', ann.id)

      if (error) throw error
      showToast('Moved back to drafts.', 'info')
      logAudit('edit', 'unpublished announcement', null, { id: ann.id })
      loadAnnouncements()
    } catch (e: any) {
      console.error(e)
      showToast('Failed to unpublish: ' + e.message, 'error')
    }
  }

  async function handleDelete(ann: Announcement) {
    if (!window.confirm('Delete this announcement? Students will stop seeing it immediately.')) return
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', ann.id)
      if (error) throw error
      showToast('Announcement deleted.', 'info')
      logAudit('delete', 'deleted announcement', null, { id: ann.id })
      loadAnnouncements()
    } catch (e: any) {
      console.error(e)
      showToast('Failed to delete: ' + e.message, 'error')
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      
      {/* Post Box */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-6 backdrop-blur-xl md:col-span-1 h-fit">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-blue-400">campaign</span>
          Post Announcement
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
              Message
            </label>
            <textarea
              placeholder="Type announcement message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[100px] w-full resize-none rounded-xl border border-white/10 bg-black/25 p-3 text-xs text-white focus:border-blue-500/50 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
              Countdown Event Date <span className="normal-case tracking-normal font-normal text-slate-500">(optional)</span>
            </label>
            <input
              type="datetime-local"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/25 p-3 text-xs text-white focus:border-blue-500/50 focus:outline-none"
              style={{ colorScheme: 'dark' }}
            />
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
              Expiry Date <span className="normal-case tracking-normal font-normal text-slate-500">(optional)</span>
            </label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/25 p-3 text-xs text-white focus:border-blue-500/50 focus:outline-none"
              style={{ colorScheme: 'dark' }}
            />
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
              Publish Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full rounded-xl border border-white/10 bg-black/25 p-3 text-xs text-white focus:border-blue-500/50 focus:outline-none"
            >
              <option value="published">Publish immediately</option>
              <option value="draft">Save as draft</option>
            </select>
          </div>

          <button
            onClick={handlePost}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 p-3 text-xs font-bold text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Posting...' : 'Post Announcement'}
          </button>
        </div>
      </div>

      {/* Feed list */}
      <div className="md:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Announcement Feed</h3>
          <button onClick={loadAnnouncements} className="text-xs font-bold text-blue-400 flex items-center gap-0.5">
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            Refresh
          </button>
        </div>

        {listLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500/20 border-t-blue-500"></div>
          </div>
        ) : announcements.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-slate-500">
            <span className="material-symbols-outlined text-4xl opacity-40 mb-2">campaign</span>
            <p className="text-sm">No announcements posted yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((ann) => {
              const isDraft = ann.status === 'draft'
              const isExpired = ann.expires_at && new Date(ann.expires_at) <= new Date()

              return (
                <div key={ann.id} className="rounded-2xl border border-white/10 bg-slate-900/40 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isDraft ? (
                        <span className="rounded-full border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-400">
                          Draft
                        </span>
                      ) : isExpired ? (
                        <span className="rounded-full border border-red-500/35 bg-red-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-400">
                          Expired
                        </span>
                      ) : (
                        <span className="rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                          Live
                        </span>
                      )}
                      <span className="text-[10px] text-slate-500">{new Date(ann.created_at).toLocaleDateString()}</span>
                    </div>

                    <div className="flex gap-2">
                      {isDraft ? (
                        <button
                          onClick={() => handlePublish(ann)}
                          className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1 text-[11px] font-bold text-emerald-400 hover:bg-emerald-500/10"
                        >
                          Publish
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUnpublish(ann)}
                          className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-2.5 py-1 text-[11px] font-bold text-amber-400 hover:bg-amber-500/10"
                        >
                          Revert to Draft
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(ann)}
                        className="rounded-lg bg-red-500/10 border border-red-500/20 px-2.5 py-1 text-[11px] font-bold text-red-400 hover:bg-red-500/20"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed font-semibold break-words whitespace-pre-wrap">{ann.message}</p>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500">
                    {ann.event_date && (
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">alarm</span>
                        Event: {new Date(ann.event_date).toLocaleString()}
                      </span>
                    )}
                    {ann.expires_at && (
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">timer</span>
                        Expires: {new Date(ann.expires_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
