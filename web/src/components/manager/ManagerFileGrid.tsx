import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { formatFileSize, timeAgo } from '../../utils/fileDisplay'
import { useToast } from '../../context/ToastContext'
import { useManagerSettings } from '../../context/ManagerSettingsContext'
import { logAudit } from '../../utils/audit'

export default function ManagerFileGrid() {
  const [files, setFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [reactionCounts, setReactionCounts] = useState<Record<string, Record<string, number>>>({})
  const [restrictedFolders, setRestrictedFolders] = useState<Set<string>>(new Set())
  const showToast = useToast()
  
  const { compactView, toggleCompactView } = useManagerSettings()

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadFilesAndRestrictions()
  }, [])

  async function loadFilesAndRestrictions() {
    setLoading(true)
    try {
      const [{ data: dbData, error: dbError }, { data: restrictionsData, error: resError }, { data: reactionsData }] = await Promise.all([
        supabase.from('files_list').select('*').order('created_at', { ascending: false }),
        supabase.from('folder_restrictions').select('folder_name'),
        supabase.from('file_reactions').select('file_id, emoji')
      ])

      if (dbError) throw dbError
      setFiles(dbData || [])

      if (!resError && restrictionsData) {
        setRestrictedFolders(new Set(restrictionsData.map(r => r.folder_name)))
      }

      if (reactionsData) {
        const counts: Record<string, Record<string, number>> = {}
        reactionsData.forEach(r => {
          if (!counts[r.file_id]) counts[r.file_id] = {}
          counts[r.file_id][r.emoji] = (counts[r.file_id][r.emoji] || 0) + 1
        })
        setReactionCounts(counts)
      }
    } catch (e: any) {
      console.error(e)
      showToast('Failed to load manager files.', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Get distinct folders
  const folders = Array.from(new Set(files.map(f => f.folder_name).filter(Boolean))) as string[]

  async function toggleFolderRestriction(folderName: string) {
    const isLocked = restrictedFolders.has(folderName)
    try {
      if (isLocked) {
        const { error } = await supabase.from('folder_restrictions').delete().eq('folder_name', folderName)
        if (error) throw error
        
        setRestrictedFolders(prev => {
          const next = new Set(prev)
          next.delete(folderName)
          return next
        })
        showToast(`🔓 "${folderName}" folder is now public.`, 'success')
        logAudit('edit', null, folderName, { restriction: 'removed' })
      } else {
        const { error } = await supabase.from('folder_restrictions').insert({ folder_name: folderName })
        if (error) throw error
        
        setRestrictedFolders(prev => {
          const next = new Set(prev)
          next.add(folderName)
          return next
        })
        showToast(`🔒 "${folderName}" restricted to authorised students only.`, 'success')
        logAudit('edit', null, folderName, { restriction: 'added' })
      }
    } catch (err: any) {
      if (err.message && err.message.includes('does not exist')) {
        showToast('Restrictions table not set up in Supabase.', 'error')
      } else {
        showToast('Failed to toggle restriction: ' + err.message, 'error')
      }
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
      const paths = filesToDelete.map(f => {
        // storage path structure: either folder/filename or filename
        return f.folder_name && f.folder_name !== 'Root'
          ? `${f.folder_name}/${f.file_name}`
          : f.file_name
      })

      // 2. Delete from storage
      const { error: storageError } = await supabase.storage.from('vault-files').remove(paths)
      if (storageError) throw storageError

      // 3. Delete from DB
      const idsArray = Array.from(selectedIds)
      const { error: dbError } = await supabase.from('files_list').delete().in('id', idsArray)
      if (dbError) throw dbError

      showToast(`Deleted ${selectedIds.size} file(s).`, 'success')
      
      // Log audit action
      filesToDelete.forEach(f => {
        logAudit('delete', f.file_name, f.folder_name || null)
      })

      setSelectedIds(new Set())
      loadFilesAndRestrictions()
    } catch (e: any) {
      console.error(e)
      showToast('Failed to delete files.', 'error')
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Folder Restrictions */}
      {folders.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-slate-900/40 p-4 backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Folder Restrictions</h4>
            <span className="text-[10px] text-slate-500">Lock folders to restrict access.</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {folders.map(folder => {
              const isLocked = restrictedFolders.has(folder)
              return (
                <div 
                  key={folder}
                  onClick={() => toggleFolderRestriction(folder)}
                  className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-all hover:bg-white/5 ${
                    isLocked ? 'border-amber-500/30 bg-amber-500/5 text-amber-400' : 'border-white/5 bg-white/[0.02] text-slate-300'
                  }`}
                >
                  <div className="min-w-0 flex-1 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">folder</span>
                    <span className="truncate text-xs font-bold">{folder}</span>
                  </div>
                  <span className="material-symbols-outlined text-[18px] ml-2 shrink-0">
                    {isLocked ? 'lock' : 'lock_open'}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}

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
          {/* Compact View Toggle */}
          <button
            onClick={toggleCompactView}
            className={`flex items-center justify-center rounded-xl border p-2 transition-all ${
              compactView 
                ? 'border-blue-500/40 bg-blue-500/20 text-blue-400' 
                : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
            title="Toggle compact layout"
          >
            <span className="material-symbols-outlined text-[18px]">density_small</span>
          </button>

          <button 
            onClick={loadFilesAndRestrictions}
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

      {/* List / Grid */}
      {loading && files.length === 0 ? (
        <div className="flex justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500/20 border-t-blue-500"></div>
        </div>
      ) : files.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 text-slate-500">
          <span className="material-symbols-outlined mb-2 text-4xl opacity-50">folder_open</span>
          <p className="text-sm">No files found in the vault.</p>
        </div>
      ) : compactView ? (
        /* Compact Vertical List Layout */
        <div className="divide-y divide-white/5 rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-xl">
          {files.map(file => (
            <div 
              key={file.id}
              className={`flex items-center justify-between p-3 transition-colors ${
                selectedIds.has(file.id) ? 'bg-blue-500/5' : 'hover:bg-white/[0.01]'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <input 
                  type="checkbox"
                  checked={selectedIds.has(file.id)}
                  onChange={() => toggleSelection(file.id)}
                  className="h-4 w-4 rounded border-white/20 bg-black/20 accent-blue-500 cursor-pointer"
                />
                <div className="min-w-0 flex-1 flex items-center gap-2">
                  <span className="material-symbols-outlined text-slate-500 text-[18px] shrink-0">draft</span>
                  <p className="truncate text-xs font-bold text-slate-200" title={file.file_name}>
                    {file.file_name}
                  </p>
                  {file.folder_name && (
                    <span className="shrink-0 rounded-sm bg-white/5 px-1 py-0.5 text-[9px] text-slate-500">
                      📁 {file.folder_name}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-slate-500 shrink-0 ml-4 font-semibold">
                <span>{formatFileSize(file.file_size)}</span>
                <span className="flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[13px]">download</span>
                  {file.download_count || 0}
                </span>
                {reactionCounts[file.id] && Object.entries(reactionCounts[file.id]).map(([emoji, count]) => (
                  <span key={emoji} className="flex items-center gap-0.5">
                    {emoji} {count}
                  </span>
                ))}
                <span className="text-[10px]">{file.created_at ? timeAgo(file.created_at) : 'N/A'}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Grid Layout */
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
                  <span className="flex items-center gap-0.5" title="Downloads">
                    <span className="material-symbols-outlined text-[13px]">download</span>
                    {file.download_count || 0}
                  </span>
                  {reactionCounts[file.id] && Object.entries(reactionCounts[file.id]).map(([emoji, count]) => (
                    <span key={emoji} className="flex items-center gap-0.5" title={`${count} ${emoji} reactions`}>
                      {emoji} {count}
                    </span>
                  ))}
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
