import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'
import { formatFileSize, timeAgo } from '../../utils/fileDisplay'
import { logAudit } from '../../utils/audit'

interface ScheduledFile {
  id: string
  file_name: string
  folder_name: string
  file_size: number
  scheduled_at: string
  created_at: string
}

export default function ManagerScheduledFiles() {
  const showToast = useToast()
  const [files, setFiles] = useState<ScheduledFile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadScheduledFiles()
  }, [])

  async function loadScheduledFiles() {
    setLoading(true)
    try {
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('files_list')
        .select('*')
        .not('scheduled_at', 'is', null)
        .gt('scheduled_at', now)
        .order('scheduled_at', { ascending: true })

      if (error) throw error
      setFiles(data || [])
    } catch (e: any) {
      console.error(e)
      showToast('Failed to load scheduled files.', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function publishNow(file: ScheduledFile) {
    if (!window.confirm(`Publish "${file.file_name}" immediately? Students will be able to see it right now.`)) return

    try {
      const { error } = await supabase
        .from('files_list')
        .update({ scheduled_at: null })
        .eq('id', file.id)

      if (error) throw error

      showToast(`🚀 "${file.file_name}" is now live!`, 'success')
      logAudit('edit', file.file_name, file.folder_name, { publish: 'immediate_scheduled' })

      // Trigger Push Notification Broadcast
      const session = (await supabase.auth.getSession()).data.session
      const apiHost = import.meta.env.DEV ? 'http://localhost:3000' : 'https://project-one-187u.onrender.com'
      fetch(`${apiHost}/api/push/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          title: '📁 New files in the Vault!',
          body: `1 new file uploaded to ${file.folder_name}. Tap to view.`,
          url: `/?folder=${encodeURIComponent(file.folder_name)}`
        })
      }).catch(() => {})

      loadScheduledFiles()
    } catch (e: any) {
      console.error(e)
      showToast('Failed to publish: ' + e.message, 'error')
    }
  }

  async function handleReschedule(file: ScheduledFile) {
    const defaultVal = file.scheduled_at ? file.scheduled_at.substring(0, 16) : ''
    const val = window.prompt('Enter new schedule release date and time (YYYY-MM-DDTHH:MM):', defaultVal)
    if (!val) return

    try {
      const newDate = new Date(val).toISOString()
      const { error } = await supabase
        .from('files_list')
        .update({ scheduled_at: newDate })
        .eq('id', file.id)

      if (error) throw error

      showToast('File rescheduled successfully.', 'success')
      logAudit('edit', file.file_name, file.folder_name, { rescheduledTo: newDate })
      loadScheduledFiles()
    } catch (e: any) {
      console.error(e)
      showToast('Failed to reschedule: ' + e.message, 'error')
    }
  }

  async function handleDelete(file: ScheduledFile) {
    if (!window.confirm(`Delete "${file.file_name}"? This deletes the file completely from storage and DB.`)) return

    try {
      // 1. Delete from storage
      const storagePath = file.folder_name && file.folder_name !== 'Root' 
        ? `${file.folder_name}/${file.file_name}` 
        : file.file_name
      await supabase.storage.from('vault-files').remove([storagePath])

      // 2. Delete from DB
      const { error } = await supabase.from('files_list').delete().eq('id', file.id)
      if (error) throw error

      showToast('Scheduled file deleted.', 'info')
      logAudit('delete', file.file_name, file.folder_name, { deletedFrom: 'scheduled_list' })
      loadScheduledFiles()
    } catch (e: any) {
      console.error(e)
      showToast('Failed to delete: ' + e.message, 'error')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">Scheduled Releases ({files.length})</h3>
        <button onClick={loadScheduledFiles} className="text-xs font-bold text-blue-400 flex items-center gap-0.5">
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
          <span className="material-symbols-outlined text-4xl opacity-40 mb-2">alarm</span>
          <p className="text-sm">No scheduled releases found.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {files.map((file) => (
            <div key={file.id} className="rounded-2xl border border-white/10 bg-slate-900/40 p-4 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start gap-2">
                  <p className="text-xs font-extrabold text-slate-200 truncate flex-1" title={file.file_name}>
                    📄 {file.file_name}
                  </p>
                  <span className="shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-slate-500">
                    {formatFileSize(file.file_size)}
                  </span>
                </div>
                
                <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold">
                  📁 {file.folder_name || 'Root'}
                </p>

                <div className="mt-3 flex items-center gap-1.5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5 text-amber-500 text-[11px] font-semibold">
                  <span className="material-symbols-outlined text-[14px]">alarm</span>
                  <span>Release: {new Date(file.scheduled_at).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex gap-2 mt-4 pt-3 border-t border-white/5">
                <button
                  onClick={() => publishNow(file)}
                  className="flex-1 rounded-lg bg-blue-600 py-2 text-[10px] font-extrabold text-white hover:bg-blue-700"
                >
                  Publish Now
                </button>
                <button
                  onClick={() => handleReschedule(file)}
                  className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-[10px] font-extrabold text-slate-300 hover:bg-white/10"
                >
                  Reschedule
                </button>
                <button
                  onClick={() => handleDelete(file)}
                  className="rounded-lg border border-red-500/25 bg-red-500/5 px-2.5 py-2 text-[10px] font-extrabold text-red-400 hover:bg-red-500/20"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
