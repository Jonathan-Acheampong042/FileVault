import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { timeAgo } from '../../utils/fileDisplay'
import { useToast } from '../../context/ToastContext'

interface AuditEntry {
  id: number
  action: 'upload' | 'delete' | 'edit'
  file_name?: string
  folder_name?: string
  actor: string
  created_at: string
  meta?: any
}

const PAGE_SIZE = 15

export default function ManagerAuditLogs() {
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const showToast = useToast()

  useEffect(() => {
    loadLogs()
  }, [page])

  async function loadLogs() {
    setLoading(true)
    try {
      const start = page * PAGE_SIZE
      const end = start + PAGE_SIZE - 1

      const { data, count, error } = await supabase
        .from('audit_log')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(start, end)

      if (error) throw error
      setLogs(data || [])
      setTotalCount(count || 0)
    } catch (e: any) {
      console.error(e)
      showToast('Failed to load audit logs. Verify the table exists.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">System Audit Log ({totalCount})</h3>
        <button
          onClick={() => { setPage(0); loadLogs(); }}
          className="flex items-center gap-1 text-xs font-bold text-blue-400 hover:text-blue-300"
        >
          <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
          Refresh
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 font-extrabold uppercase tracking-wider text-slate-400">
                <th className="p-3">Actor</th>
                <th className="p-3">Action</th>
                <th className="p-3">Details</th>
                <th className="p-3">Folder</th>
                <th className="p-3">Time</th>
              </tr>
            </thead>
            <tbody>
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500/20 border-t-blue-500 mx-auto"></div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 italic">
                    No logs found.
                  </td>
                </tr>
              ) : (
                logs.map(log => {
                  let actionColor = 'text-blue-400 border-blue-500/35 bg-blue-500/10'
                  if (log.action === 'delete') actionColor = 'text-red-400 border-red-500/35 bg-red-500/10'
                  if (log.action === 'edit') actionColor = 'text-amber-400 border-amber-500/35 bg-amber-500/10'

                  return (
                    <tr key={log.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                      <td className="p-3 font-semibold text-slate-200">{log.actor}</td>
                      <td className="p-3">
                        <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${actionColor}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 text-slate-300 font-medium truncate max-w-[200px]" title={log.file_name}>
                        {log.file_name || 'N/A'}
                        {log.meta && (
                          <div className="mt-0.5 text-[9px] text-slate-500">
                            {JSON.stringify(log.meta)}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-slate-400 font-semibold">{log.folder_name || 'Root'}</td>
                      <td className="p-3 text-slate-500" title={new Date(log.created_at).toLocaleString()}>
                        {timeAgo(log.created_at)}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-white/10 p-3.5 bg-black/10">
            <span className="text-[11px] font-semibold text-slate-500">
              Page {page + 1} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-bold text-slate-300 transition-colors hover:bg-white/10 disabled:opacity-30"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
                className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-bold text-slate-300 transition-colors hover:bg-white/10 disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
