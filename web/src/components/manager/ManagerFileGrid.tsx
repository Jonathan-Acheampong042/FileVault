import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { formatFileSize, timeAgo } from '../../utils/fileDisplay'
import { useToast } from '../../context/ToastContext'

export default function ManagerFileGrid() {
  const [files, setFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const showToast = useToast()

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadFiles()
  }, [])

  async function loadFiles() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('files_list')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setFiles(data || [])
    } catch (e) {
      console.error(e)
      showToast('Failed to load files.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const selectAll = () => {
    if (selectedIds.size === files.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(files.map(f => f.id)))
    }
  }

  async function deleteSelected() {
    if (selectedIds.size === 0) return
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} file(s)?`)) return

    try {
      // 1. Get the files to delete their storage blobs
      const filesToDelete = files.filter(f => selectedIds.has(f.id))
      const paths = filesToDelete.map(f => f.file_name) // assuming file_name is the storage path

      // 2. Delete from storage
      const { error: storageError } = await supabase.storage.from('vault-files').remove(paths)
      if (storageError) throw storageError

      // 3. Delete from DB
      const idsArray = Array.from(selectedIds)
      const { error: dbError } = await supabase.from('files_list').delete().in('id', idsArray)
      if (dbError) throw dbError

      showToast(`Deleted ${selectedIds.size} file(s).`, 'success')
      setSelectedIds(new Set())
      loadFiles()
    } catch (e) {
      console.error(e)
      showToast('Failed to delete files.', 'error')
    }
  }

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-3">
        <div className="flex items-center gap-3 px-2">
          <input 
            type="checkbox" 
            checked={files.length > 0 && selectedIds.size === files.length}
            onChange={selectAll}
            className="h-4 w-4 rounded border-white/20 bg-black/20 accent-blue-500 cursor-pointer"
          />
          <span className="text-sm font-semibold text-slate-300">
            {selectedIds.size} selected
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={loadFiles}
            className="flex items-center justify-center rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 hover:bg-white/10 transition-colors"
            title="Refresh list"
          >
            <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
          </button>

          {selectedIds.size > 0 && (
            <button 
              onClick={deleteSelected}
              className="flex items-center gap-1 rounded-xl bg-red-500/20 px-3 py-2 text-sm font-bold text-red-400 hover:bg-red-500/30 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
              Delete Selected
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      {loading && files.length === 0 ? (
        <div className="flex justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500/20 border-t-blue-500"></div>
        </div>
      ) : files.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 text-slate-500">
          <span className="material-symbols-outlined mb-2 text-4xl opacity-50">folder_open</span>
          <p className="text-sm">No files found in the vault.</p>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {files.map(file => (
            <div 
              key={file.id} 
              className={`group flex items-start gap-3 rounded-xl border p-3 transition-colors ${
                selectedIds.has(file.id)
                  ? 'border-blue-500/50 bg-blue-500/10'
                  : 'border-white/5 bg-white/5 hover:border-white/20 hover:bg-white/10'
              }`}
            >
              <div className="pt-1">
                <input 
                  type="checkbox"
                  checked={selectedIds.has(file.id)}
                  onChange={() => toggleSelection(file.id)}
                  className="h-4 w-4 rounded border-white/20 bg-black/20 accent-blue-500 cursor-pointer"
                />
              </div>
              <div className="min-w-0 flex-1 cursor-pointer" onClick={() => toggleSelection(file.id)}>
                <p className="truncate text-[13px] font-bold text-slate-200" title={file.file_name}>
                  {file.file_name}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-400">
                  {file.folder_name && (
                    <span className="flex items-center gap-0.5 rounded-sm bg-white/5 px-1 py-0.5">
                      <span className="material-symbols-outlined text-[12px]">folder</span>
                      <span className="truncate max-w-[80px]">{file.folder_name}</span>
                    </span>
                  )}
                  <span>{formatFileSize(file.file_size)}</span>
                  <span>{file.created_at ? timeAgo(file.created_at) : 'Unknown date'}</span>
                </div>
                
                <div className="mt-2 flex items-center gap-3 text-[11px] font-semibold text-slate-500">
                  <span className="flex items-center gap-1" title="Downloads">
                    <span className="material-symbols-outlined text-[14px]">download</span>
                    {file.download_count || 0}
                  </span>
                  {file.expires_at && (
                    <span className="flex items-center gap-1 text-amber-500" title={`Expires ${new Date(file.expires_at).toLocaleDateString()}`}>
                      <span className="material-symbols-outlined text-[14px]">timer</span>
                      Expiring
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
