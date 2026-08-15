import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'
import { logAudit } from '../../utils/audit'

interface CheckedFile {
  id: string
  file_name: string
  folder_name: string
  download_url: string
  status: 'pending' | 'checking' | 'ok' | 'broken'
}

export default function ManagerLinkChecker() {
  const showToast = useToast()
  const [files, setFiles] = useState<CheckedFile[]>([])
  const [checking, setChecking] = useState(false)

  async function loadAndScanLinks() {
    setChecking(true)
    showToast('Fetching files from database...', 'info')
    try {
      const { data, error } = await supabase
        .from('files_list')
        .select('id, file_name, folder_name, download_url')

      if (error) throw error

      const list: CheckedFile[] = (data || []).map(f => ({
        ...f,
        status: 'pending'
      }))
      setFiles(list)

      showToast('Starting diagnostic scan...', 'info')

      // Scan links sequentially or with small chunks to prevent rate limit
      for (let i = 0; i < list.length; i++) {
        const item = list[i]
        setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'checking' } : f))
        
        const status = await checkLink(item.download_url)
        setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status } : f))
      }

      showToast('Diagnostic scan complete.', 'success')
    } catch (e: any) {
      console.error(e)
      showToast('Link scan failed: ' + e.message, 'error')
    } finally {
      setChecking(false)
    }
  }

  async function checkLink(url: string): Promise<'ok' | 'broken'> {
    try {
      const res = await fetch(url, { method: 'GET' })
      if (res.status === 404 || res.status === 403) {
        return 'broken'
      }
      return 'ok'
    } catch {
      // Opaque response or CORS network failure usually means the endpoint exists
      // but blocked browser JavaScript fetch access. Dead Supabase links return 404.
      return 'ok'
    }
  }

  async function handleDelete(file: CheckedFile) {
    if (!window.confirm(`Delete database entry for "${file.file_name}"? This will NOT delete any storage files.`)) return

    try {
      const { error } = await supabase.from('files_list').delete().eq('id', file.id)
      if (error) throw error

      showToast('Database record purged.', 'info')
      logAudit('delete', file.file_name, file.folder_name, { source: 'link_checker_purge' })
      setFiles(prev => prev.filter(f => f.id !== file.id))
    } catch (e: any) {
      console.error(e)
      showToast('Purge failed: ' + e.message, 'error')
    }
  }

  const brokenCount = files.filter(f => f.status === 'broken').length
  const okCount = files.filter(f => f.status === 'ok').length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold text-white">Link Diagnostic Scanner</h3>
          {files.length > 0 && (
            <div className="flex gap-2">
              <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-400">
                {okCount} OK
              </span>
              <span className={`rounded px-2 py-0.5 text-[9px] font-bold ${brokenCount > 0 ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-slate-500'}`}>
                {brokenCount} Broken
              </span>
            </div>
          )}
        </div>
        <button
          disabled={checking}
          onClick={loadAndScanLinks}
          className="flex items-center gap-1 text-xs font-bold text-blue-400 hover:text-blue-300 disabled:opacity-50"
        >
          <span className={`material-symbols-outlined text-[16px] ${checking ? 'animate-spin' : ''}`}>sync</span>
          {checking ? 'Scanning...' : 'Start Link Scan'}
        </button>
      </div>

      {files.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-slate-500 bg-slate-900/40">
          <span className="material-symbols-outlined text-4xl opacity-40 mb-2">link_off</span>
          <p className="text-sm">Click "Start Link Scan" to verify database download URLs.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 font-extrabold uppercase tracking-wider text-slate-400">
                  <th className="p-3">File Name</th>
                  <th className="p-3">Folder</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.map(file => (
                  <tr key={file.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.01]">
                    <td className="p-3 font-semibold text-slate-200 truncate max-w-[240px]" title={file.file_name}>
                      {file.file_name}
                    </td>
                    <td className="p-3 text-slate-400 font-semibold">{file.folder_name || 'Root'}</td>
                    <td className="p-3">
                      {file.status === 'pending' && (
                        <span className="text-slate-500 font-semibold">Pending</span>
                      )}
                      {file.status === 'checking' && (
                        <span className="text-blue-400 font-semibold flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-ping"></span> Checking...
                        </span>
                      )}
                      {file.status === 'ok' && (
                        <span className="text-emerald-400 font-bold">✓ Active</span>
                      )}
                      {file.status === 'broken' && (
                        <span className="text-red-400 font-bold">⚠ Broken Link</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {file.status === 'broken' && (
                        <button
                          onClick={() => handleDelete(file)}
                          className="rounded-lg bg-red-500/10 border border-red-500/20 px-2.5 py-1 text-[10px] font-extrabold text-red-400 hover:bg-red-500/20 transition-colors"
                        >
                          Purge Entry
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
