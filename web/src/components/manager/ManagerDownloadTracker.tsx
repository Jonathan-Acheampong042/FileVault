import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'
import { formatFileSize } from '../../utils/fileDisplay'

interface TrackerFile {
  id: string
  file_name: string
  folder_name: string
  download_count: number
  file_size: number
}

export default function ManagerDownloadTracker() {
  const showToast = useToast()
  const [files, setFiles] = useState<TrackerFile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTrackerData()
  }, [])

  async function loadTrackerData() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('files_list')
        .select('id, file_name, folder_name, download_count, file_size')
        .order('download_count', { ascending: false })

      if (error) throw error
      setFiles(data || [])
    } catch (e: any) {
      console.error(e)
      showToast('Failed to load download tracker.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const maxCount = Math.max(...files.map(f => f.download_count || 0), 1)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">Download Tracker ({files.length} files)</h3>
        <button onClick={loadTrackerData} className="text-xs font-bold text-blue-400 flex items-center gap-0.5">
          <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
          Refresh
        </button>
      </div>

      {loading && files.length === 0 ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500/20 border-t-blue-500"></div>
        </div>
      ) : files.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-slate-500">
          <span className="material-symbols-outlined text-4xl opacity-40 mb-2">monitoring</span>
          <p className="text-sm">No files uploaded yet to track downloads.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-5 space-y-4 backdrop-blur-xl">
          <div className="grid gap-3">
            {files.map((file) => {
              const count = file.download_count || 0
              const pct = Math.round((count / maxCount) * 100)

              return (
                <div key={file.id} className="flex flex-col gap-2 rounded-xl bg-black/10 border border-white/5 p-4 hover:bg-white/[0.01] transition-all">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-200 truncate">{file.file_name}</p>
                      <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                        📁 {file.folder_name || 'Root'} · {formatFileSize(file.file_size)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-black text-slate-100 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px] text-slate-400">download</span>
                        {count}
                      </p>
                      <p className="text-[9px] text-slate-500 mt-0.5">{pct}% popularity</p>
                    </div>
                  </div>

                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500" 
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
