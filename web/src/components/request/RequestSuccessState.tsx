import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'

interface RequestSuccessStateProps {
  requestId: string
}

export default function RequestSuccessState({ requestId }: RequestSuccessStateProps) {
  const showToast = useToast()
  
  const [status, setStatus] = useState<string>('pending')
  const [managerNote, setManagerNote] = useState<string | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(false)
  
  useEffect(() => {
    if (requestId) {
      pollStatus()
    }
  }, [requestId])

  async function pollStatus() {
    setLoadingStatus(true)
    try {
      const { data, error } = await supabase
        .from('upload_requests')
        .select('status, manager_note')
        .eq('id', requestId)
        .single()
        
      if (!error && data) {
        setStatus(data.status)
        setManagerNote(data.manager_note)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingStatus(false)
    }
  }

  function handleCopyToken() {
    navigator.clipboard.writeText(requestId).then(() => {
      showToast('Token copied to clipboard!', 'success')
    }).catch(() => {
      showToast('Failed to copy token.', 'error')
    })
  }
  
  const statusConfig: Record<string, { dot: string; label: string }> = {
    pending: { dot: 'bg-amber-500', label: 'Pending review' },
    approved: { dot: 'bg-emerald-500', label: 'Approved — file uploaded to Vault!' },
    dismissed: { dot: 'bg-slate-500', label: 'Dismissed by manager' }
  }
  
  const currentStatus = statusConfig[status] || { dot: 'bg-slate-400', label: status }

  return (
    <div className="py-2 animate-[fadeIn_0.3s_ease]">
      <div className="mb-5 text-center">
        <span className="material-symbols-outlined mb-2.5 block text-[52px] text-emerald-400">check_circle</span>
        <h2 className="mb-2 text-lg font-extrabold text-white">Request Submitted!</h2>
        <p className="m-0 text-[13px] leading-relaxed text-slate-500">
          Your request has been sent. Once the manager uploads the file it'll appear in the Vault.
        </p>
      </div>

      <div className="mb-4 rounded-[14px] border border-blue-500/20 bg-blue-500/[0.08] p-3.5">
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-400">
          Your Request ID — save this!
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 break-all rounded-lg bg-black/25 px-2.5 py-1.5 font-mono text-xs text-blue-300">
            {requestId}
          </code>
          <button
            onClick={handleCopyToken}
            className="flex shrink-0 items-center gap-1 rounded-lg border border-blue-500/25 bg-blue-500/15 px-2.5 py-1.5 text-xs font-bold text-blue-300 transition-colors hover:bg-blue-500/25"
          >
            <span className="material-symbols-outlined text-[14px]">content_copy</span> Copy
          </button>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          This page URL also contains your ID — bookmark it to return here and check your status.
        </p>
      </div>

      <div className="mb-4 rounded-[14px] border border-white/5 bg-white/[0.03] p-3.5">
        <div className="mb-2.5 flex items-center justify-between">
          <p className="m-0 text-[11px] font-bold uppercase tracking-widest text-slate-400">Request Status</p>
          <button
            onClick={pollStatus}
            disabled={loadingStatus}
            className="flex items-center gap-1 text-[11px] font-bold text-blue-400 hover:text-blue-300 disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-[14px] ${loadingStatus ? 'animate-spin' : ''}`}>
              refresh
            </span> 
            Refresh
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${currentStatus.dot}`}></span>
          <span className="text-[13px] font-semibold text-slate-200">{currentStatus.label}</span>
        </div>
        
        {managerNote && (
          <p className="mt-2 rounded-lg border-l-[3px] border-slate-500/40 bg-slate-500/10 px-2.5 py-2 text-xs text-slate-300">
            💬 {managerNote}
          </p>
        )}
      </div>

      <div className="text-center">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-500/20 px-5 py-2.5 text-[13px] font-bold text-blue-300 transition-colors hover:bg-blue-500/30"
        >
          <span className="material-symbols-outlined text-[16px]">folder_shared</span> 
          Back to Vault
        </Link>
      </div>
    </div>
  )
}
