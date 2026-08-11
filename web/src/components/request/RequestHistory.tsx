import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { timeAgo } from '../../utils/fileDisplay'

interface RequestHistoryProps {
  email: string
  onSelectRequest: (id: string) => void
}

export default function RequestHistory({ email, onSelectRequest }: RequestHistoryProps) {
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (email) {
      loadHistory()
    }
  }, [email])

  async function loadHistory() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('upload_requests')
        .select('*')
        .eq('requester_email', email)
        .order('created_at', { ascending: false })
        .limit(50)
      
      if (!error && data) {
        setHistory(data)
      }
    } catch (e) {
      console.error('Failed to load history', e)
    } finally {
      setLoading(false)
    }
  }

  function toggleExpand(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }
  
  const statusConfig: Record<string, { bg: string; text: string; label: string; dot: string }> = {
    pending: { bg: 'bg-amber-500/20', text: 'text-amber-400', dot: 'bg-amber-500', label: 'Pending' },
    approved: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', dot: 'bg-emerald-500', label: 'Approved' },
    dismissed: { bg: 'bg-slate-500/20', text: 'text-slate-400', dot: 'bg-slate-500', label: 'Dismissed' }
  }

  return (
    <div className="mt-7">
      <div className="mb-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-blue-400">history</span>
          <h2 className="m-0 text-sm font-extrabold text-white">Request History</h2>
          {history.length > 0 && (
            <span className="ml-0.5 text-[11px] font-semibold text-slate-500">
              ({history.length})
            </span>
          )}
        </div>
        <button
          onClick={loadHistory}
          disabled={loading}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-blue-400 transition-colors hover:bg-blue-500/10 disabled:opacity-50"
        >
          <span className={`material-symbols-outlined text-[14px] ${loading ? 'animate-spin' : ''}`}>
            refresh
          </span> 
          Refresh
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {loading && history.length === 0 && (
          <>
            <div className="h-[54px] w-full animate-pulse rounded-[14px] bg-white/5"></div>
            <div className="h-[54px] w-full animate-pulse rounded-[14px] bg-white/5"></div>
          </>
        )}

        {!loading && history.length === 0 && (
          <div className="py-7 text-center text-[12.5px] text-slate-500">
            <span className="material-symbols-outlined mb-2 block text-[28px] opacity-50">inbox</span>
            You haven't submitted any requests yet.
          </div>
        )}

        {history.map(req => {
          const isExpanded = expanded[req.id]
          const cfg = statusConfig[req.status] || { bg: 'bg-slate-500/20', text: 'text-slate-400', dot: 'bg-slate-400', label: req.status }
          
          return (
            <div 
              key={req.id} 
              className="rounded-[14px] border border-white/5 bg-white/[0.03] transition-colors hover:border-white/15"
            >
              <div 
                className="flex cursor-pointer items-center gap-2.5 p-3.5 select-none"
                onClick={() => onSelectRequest(req.id)}
              >
                <div className={`h-2 w-2 shrink-0 rounded-full ${cfg.dot}`}></div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-bold text-slate-200">
                    {req.filename}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${cfg.bg} ${cfg.text}`}>
                      {cfg.label}
                    </span>
                    <span>·</span>
                    <span>{timeAgo(req.created_at)}</span>
                  </div>
                </div>
                <button 
                  onClick={(e) => toggleExpand(req.id, e)}
                  className="flex shrink-0 items-center justify-center p-1 text-slate-500"
                >
                  <span className={`material-symbols-outlined text-[18px] transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
                </button>
              </div>

              {isExpanded && (
                <div className="border-t border-white/5 px-3.5 pb-3.5 pt-3">
                  <div className="mt-3 first:mt-0">
                    <p className="mb-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Reason</p>
                    <p className="whitespace-pre-wrap break-words m-0 text-[12.5px] leading-relaxed text-slate-300">
                      {req.reason}
                    </p>
                  </div>
                  
                  {req.description && (
                    <div className="mt-3">
                      <p className="mb-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Description</p>
                      <p className="whitespace-pre-wrap break-words m-0 text-[12.5px] leading-relaxed text-slate-300">
                        {req.description}
                      </p>
                    </div>
                  )}

                  {req.folder && (
                    <div className="mt-3">
                      <p className="mb-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Course / Folder</p>
                      <p className="m-0 text-[12.5px] leading-relaxed text-slate-300">
                        {req.folder}
                      </p>
                    </div>
                  )}

                  {req.manager_note && (
                    <div className="mt-3 rounded-lg border border-blue-500/20 bg-blue-500/10 border-l-[3px] border-l-blue-500 px-3 py-2">
                      <p className="mb-1 text-[10px] font-extrabold uppercase tracking-widest text-blue-300">Manager Note</p>
                      <p className="m-0 text-[12.5px] leading-relaxed text-blue-200">
                        {req.manager_note}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
