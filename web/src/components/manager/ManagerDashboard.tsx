import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { formatFileSize, timeAgo } from '../../utils/fileDisplay'

interface FileStats {
  totalFiles: number
  totalFolders: number
  totalDownloads: number
  totalStorage: number
  expiringCount: number
}

export default function ManagerDashboard() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<FileStats | null>(null)
  const [popularFiles, setPopularFiles] = useState<any[]>([])
  const [neverDownloaded, setNeverDownloaded] = useState<any[]>([])

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('files_list')
        .select('id, file_name, folder_name, download_count, file_size, expires_at, created_at')
      
      if (error) throw error
      
      const rows = data || []
      const now = new Date()
      const sevenDays = new Date(now.getTime() + 7 * 86400000)

      const folders = new Set(rows.map(r => r.folder_name).filter(Boolean))
      
      setStats({
        totalFiles: rows.length,
        totalFolders: folders.size,
        totalDownloads: rows.reduce((acc, r) => acc + (r.download_count || 0), 0),
        totalStorage: rows.reduce((acc, r) => acc + (r.file_size || 0), 0),
        expiringCount: rows.filter(r => r.expires_at && new Date(r.expires_at) > now && new Date(r.expires_at) <= sevenDays).length
      })

      // Most Downloaded
      const popular = [...rows]
        .filter(f => (f.download_count || 0) > 0)
        .sort((a, b) => (b.download_count || 0) - (a.download_count || 0))
        .slice(0, 5)
      setPopularFiles(popular)

      // Never Downloaded
      const never = [...rows]
        .filter(f => (f.download_count || 0) === 0)
        .sort((a, b) => {
          if (!a.created_at && !b.created_at) return 0
          if (!a.created_at) return 1
          if (!b.created_at) return -1
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        })
      setNeverDownloaded(never)
      
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500/20 border-t-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500">Total Files</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{stats?.totalFiles || 0}</span>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500">Folders</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{stats?.totalFolders || 0}</span>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500">Downloads</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{stats?.totalDownloads.toLocaleString() || 0}</span>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500">Storage</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{formatFileSize(stats?.totalStorage || 0)}</span>
          </div>
        </div>
      </div>

      {stats && stats.expiringCount > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-400">
          <span className="material-symbols-outlined text-[24px]">warning</span>
          <span className="text-sm font-semibold">
            {stats.expiringCount} file(s) are expiring in the next 7 days.
          </span>
        </div>
      )}

      {/* Analytics Lists */}
      <div className="grid gap-6 md:grid-cols-2">
        
        {/* Most Downloaded */}
        {popularFiles.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
            <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-300">
              <span className="material-symbols-outlined text-amber-400">trending_up</span> 
              Most Downloaded
            </h4>
            <div className="space-y-2">
              {popularFiles.map((f, i) => (
                <div key={f.id} className="flex items-center gap-3 border-b border-white/5 py-2 last:border-0">
                  <span className="min-w-[20px] text-[11px] font-extrabold text-slate-500">#{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-200">{f.file_name}</p>
                    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/5">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500" 
                        style={{ width: `${Math.round(((f.download_count || 0) / (popularFiles[0].download_count || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="shrink-0 text-[11px] font-bold text-blue-400">{f.download_count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Never Downloaded */}
        {neverDownloaded.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
            <h4 className="mb-1.5 flex items-center gap-2 text-sm font-bold text-slate-300">
              <span className="material-symbols-outlined text-red-400">block</span> 
              Never Downloaded
              <span className="ml-1 rounded-full border border-red-500/30 bg-red-500/15 px-2 py-0.5 text-[10px] font-extrabold text-red-400">
                {neverDownloaded.length}
              </span>
            </h4>
            <p className="mb-4 text-[11px] text-slate-500">Files with zero downloads. Oldest uploads listed first.</p>
            
            <div className="max-h-[300px] space-y-2 overflow-y-auto pr-2">
              {neverDownloaded.map(f => (
                <div key={f.id} className="flex items-center gap-3 border-b border-white/5 py-2 last:border-0">
                  <span className="material-symbols-outlined shrink-0 text-[16px] text-slate-600">block</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-200">{f.file_name}</p>
                    {f.folder_name && (
                      <p className="mt-px text-[10px] text-slate-500">📁 {f.folder_name}</p>
                    )}
                  </div>
                  {f.created_at && (
                    <span className="shrink-0 rounded-full border border-slate-500/30 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                      {timeAgo(f.created_at)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
      </div>
    </div>
  )
}
