import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { timeAgo } from '../../utils/fileDisplay'
import { useToast } from '../../context/ToastContext'

interface UploadRequest {
  id: string
  filename: string
  description?: string
  reason?: string
  folder?: string
  status: 'pending' | 'approved' | 'dismissed'
  requester_email: string
  created_at: string
  manager_note?: string
}

export default function ManagerUploadRequests() {
  const [requests, setRequests] = useState<UploadRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [activeRequest, setActiveRequest] = useState<UploadRequest | null>(null)
  
  // Action state
  const [managerNote, setManagerNote] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const showToast = useToast()

  useEffect(() => {
    loadRequests()
  }, [])

  async function loadRequests() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('upload_requests')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setRequests(data || [])
    } catch (e) {
      console.error(e)
      showToast('Failed to load requests.', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleAction(status: 'pending' | 'approved' | 'dismissed') {
    if (!activeRequest) return
    setActionLoading(true)

    try {
      const { error } = await supabase
        .from('upload_requests')
        .update({ status, manager_note: managerNote || null })
        .eq('id', activeRequest.id)

      if (error) throw error

      showToast(`Request marked as ${status}.`, 'success')

      // Notify the user if we approved/dismissed their request
      if (status !== 'pending') {
        try {
          const session = (await supabase.auth.getSession()).data.session
          const apiHost = import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? 'http://localhost:3000' : 'https://project-one-187u.onrender.com')
          
          await fetch(`${apiHost}/api/push/notify-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token}`
            },
            body: JSON.stringify({
              email: activeRequest.requester_email,
              title: status === 'approved' ? '✅ Request Approved' : '❌ Request Dismissed',
              body: status === 'approved' 
                ? `Your request for "${activeRequest.filename}" has been uploaded! ${managerNote ? `Note: ${managerNote}` : ''}`
                : `Your request for "${activeRequest.filename}" could not be fulfilled. ${managerNote ? `Note: ${managerNote}` : ''}`,
              url: '/'
            })
          })
        } catch (notifyErr) {
          console.warn('Failed to send push notification to user:', notifyErr)
        }
      }

      setRequests(prev => prev.map(r => r.id === activeRequest.id ? { ...r, status, manager_note: managerNote || undefined } : r))
      setActiveRequest(null)
      setManagerNote('')
    } catch (e) {
      console.error(e)
      showToast(`Failed to update request.`, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const pending = requests.filter(r => r.status === 'pending')
  const completed = requests.filter(r => r.status !== 'pending')

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* List Column */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Requests</h3>
          <button 
            onClick={loadRequests} 
            className="flex items-center gap-1 text-xs font-bold text-blue-400 hover:text-blue-300"
          >
            <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
            Refresh
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {loading && requests.length === 0 && (
            <div className="h-16 animate-pulse rounded-xl bg-white/5"></div>
          )}

          {!loading && requests.length === 0 && (
            <div className="py-12 text-center text-slate-500">
              <span className="material-symbols-outlined mb-2 block text-3xl opacity-50">inbox</span>
              <p className="text-sm">No upload requests found.</p>
            </div>
          )}

          {pending.length > 0 && (
            <div className="mb-2">
              <p className="mb-2 text-[10px] font-extrabold uppercase tracking-widest text-amber-500">Pending Review</p>
              <div className="flex flex-col gap-2">
                {pending.map(req => (
                  <button
                    key={req.id}
                    onClick={() => { setActiveRequest(req); setManagerNote(req.manager_note || '') }}
                    className={`flex items-start justify-between rounded-xl border p-3 text-left transition-colors ${
                      activeRequest?.id === req.id 
                        ? 'border-blue-500/50 bg-blue-500/10' 
                        : 'border-white/5 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold text-slate-200">{req.filename}</p>
                      <p className="mt-1 truncate text-[11px] text-slate-400">
                        {req.requester_email} • {timeAgo(req.created_at)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {completed.length > 0 && (
            <div>
              <p className="mb-2 mt-4 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Past Requests</p>
              <div className="flex flex-col gap-2">
                {completed.map(req => (
                  <button
                    key={req.id}
                    onClick={() => { setActiveRequest(req); setManagerNote(req.manager_note || '') }}
                    className={`flex items-start justify-between rounded-xl border p-3 text-left transition-colors ${
                      activeRequest?.id === req.id 
                        ? 'border-slate-500/50 bg-slate-500/10' 
                        : 'border-white/5 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full shrink-0 ${req.status === 'approved' ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
                        <p className="truncate text-[13px] font-bold text-slate-400">{req.filename}</p>
                      </div>
                      <p className="mt-1 truncate text-[11px] text-slate-500">
                        {timeAgo(req.created_at)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Column */}
      <div className="flex flex-col">
        {activeRequest ? (
          <div className="sticky top-20 rounded-2xl border border-white/10 bg-slate-900/50 p-5 backdrop-blur-md sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-sm font-bold text-white">Request Details</h4>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                activeRequest.status === 'pending' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                activeRequest.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                'bg-slate-500/20 text-slate-400 border border-slate-500/30'
              }`}>
                {activeRequest.status}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Requested File</p>
                <p className="mt-1 font-semibold text-slate-200">{activeRequest.filename}</p>
              </div>
              
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Requester Email</p>
                <p className="mt-1 text-[13px] text-slate-300">
                  <a href={`mailto:${activeRequest.requester_email}`} className="text-blue-400 hover:underline">
                    {activeRequest.requester_email}
                  </a>
                </p>
              </div>

              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Reason</p>
                <p className="mt-1 whitespace-pre-wrap break-words rounded-lg bg-white/5 p-3 text-[13px] text-slate-300">
                  {activeRequest.reason}
                </p>
              </div>

              {activeRequest.description && (
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Description</p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-[13px] text-slate-400">{activeRequest.description}</p>
                </div>
              )}

              {activeRequest.folder && (
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Target Folder</p>
                  <p className="mt-1 text-[13px] text-slate-400">{activeRequest.folder}</p>
                </div>
              )}

              <hr className="border-white/10" />

              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                  Manager Note (optional)
                </label>
                <textarea
                  value={managerNote}
                  onChange={e => setManagerNote(e.target.value)}
                  placeholder="e.g. Uploaded to UGBS 301 folder."
                  className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white placeholder-slate-600 focus:border-blue-500/50 focus:outline-none"
                  rows={2}
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  This note will be visible to the user when they check their request status.
                </p>
              </div>

              {activeRequest.status === 'pending' && (
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => handleAction('approved')}
                    disabled={actionLoading}
                    className="flex flex-1 justify-center rounded-xl bg-emerald-500 p-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
                  >
                    {actionLoading ? 'Saving...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleAction('dismissed')}
                    disabled={actionLoading}
                    className="flex flex-1 justify-center rounded-xl border border-slate-600 bg-slate-800 p-2.5 text-sm font-bold text-slate-300 transition-colors hover:bg-slate-700 disabled:opacity-50"
                  >
                    {actionLoading ? 'Saving...' : 'Dismiss'}
                  </button>
                </div>
              )}

              {activeRequest.status !== 'pending' && (
                <div className="pt-2">
                  <button
                    onClick={() => handleAction(activeRequest.status)}
                    disabled={actionLoading}
                    className="flex w-full justify-center rounded-xl bg-blue-500 p-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
                  >
                    {actionLoading ? 'Saving...' : 'Update Note'}
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 text-slate-500">
            <span className="material-symbols-outlined mb-2 text-4xl opacity-50">touch_app</span>
            <p className="text-sm font-medium">Select a request to view details</p>
          </div>
        )}
      </div>
    </div>
  )
}
