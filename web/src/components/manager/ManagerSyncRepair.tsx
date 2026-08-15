import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'
import { logAudit } from '../../utils/audit'

interface Mismatches {
  storageOnly: string[]
  dbOnly: string[]
}

export default function ManagerSyncRepair() {
  const [loading, setLoading] = useState(true)
  const [dbCount, setDbCount] = useState(0)
  const [storageCount, setStorageCount] = useState(0)
  const [mismatches, setMismatches] = useState<Mismatches>({ storageOnly: [], dbOnly: [] })
  const [repairing, setRepairing] = useState(false)
  
  const showToast = useToast()

  useEffect(() => {
    checkSync()
  }, [])

  async function listAllStorageFiles(path = ''): Promise<any[]> {
    const { data, error } = await supabase.storage.from('vault-files').list(path, { limit: 100 })
    if (error) throw error
    if (!data) return []

    let list: any[] = []
    for (const item of data) {
      if (item.id === null) {
        // Directory, query it recursively
        const subFiles = await listAllStorageFiles(path ? `${path}/${item.name}` : item.name)
        list = [...list, ...subFiles]
      } else {
        list.push({
          ...item,
          name: path ? `${path}/${item.name}` : item.name
        })
      }
    }
    return list
  }

  async function checkSync() {
    setLoading(true)
    try {
      const { data: dbData, error: dbErr } = await supabase.from('files_list').select('file_name, folder_name')
      if (dbErr) throw dbErr
      
      const storageData = await listAllStorageFiles()

      const dbFiles = dbData || []
      const dbNames = new Set(dbFiles.map(r => r.file_name))

      // Filter placeholder files
      const storageFiles = (storageData || []).filter(f => 
        f.id !== null && 
        !f.name.endsWith('.emptyFolderPlaceholder') && 
        f.name !== 'uploads'
      )
      const storageNames = new Set(storageFiles.map(f => f.name.split('/').pop() || ''))

      const storageOnly = storageFiles
        .filter(f => !dbNames.has(f.name.split('/').pop() || ''))
        .map(f => f.name)

      const dbOnly = dbFiles
        .filter(r => !storageNames.has(r.file_name))
        .map(r => r.file_name)

      setDbCount(dbFiles.length)
      setStorageCount(storageFiles.length)
      setMismatches({ storageOnly, dbOnly })
    } catch (e: any) {
      console.error(e)
      showToast('Sync check failed.', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleRepair() {
    if (mismatches.storageOnly.length === 0) {
      showToast('No storage orphans found to repair.', 'info')
      return
    }

    setRepairing(true)
    try {
      const inserts = mismatches.storageOnly.map(path => {
        const { data: urlData } = supabase.storage.from('vault-files').getPublicUrl(path)
        const displayName = path.split('/').pop() || ''
        const folderName = path.includes('/') ? path.split('/')[0] : 'Root'
        
        return {
          file_name: displayName,
          download_url: urlData.publicUrl,
          folder_name: folderName,
          download_count: 0
        }
      })

      const { error } = await supabase.from('files_list').insert(inserts)
      if (error) throw error

      showToast(`Successfully repaired ${inserts.length} file(s)!`, 'success')
      logAudit('edit', `${inserts.length} file(s) sync-repaired`, null, { orphans: mismatches.storageOnly })
      await checkSync()
    } catch (e: any) {
      console.error(e)
      showToast('Repair failed: ' + e.message, 'error')
    } finally {
      setRepairing(false)
    }
  }

  async function handlePurgeDbOnly() {
    if (mismatches.dbOnly.length === 0) return
    if (!window.confirm(`Are you sure you want to delete ${mismatches.dbOnly.length} database record(s) that have no matching storage files?`)) return

    setRepairing(true)
    try {
      const { error } = await supabase
        .from('files_list')
        .delete()
        .in('file_name', mismatches.dbOnly)

      if (error) throw error

      showToast(`Successfully purged ${mismatches.dbOnly.length} missing records.`, 'success')
      logAudit('delete', `${mismatches.dbOnly.length} db-orphans purged`, null, { records: mismatches.dbOnly })
      await checkSync()
    } catch (e: any) {
      console.error(e)
      showToast('Purge failed: ' + e.message, 'error')
    } finally {
      setRepairing(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 animate-[fadeInUp_0.4s_ease-out_both]">
      <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-6 backdrop-blur-xl">
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-blue-400">sync</span>
          Storage & DB Sync status
        </h3>

        {loading ? (
          <div className="flex justify-center py-6">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500/20 border-t-blue-500"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Counts */}
            <div className="grid grid-cols-2 gap-4 rounded-xl bg-black/20 p-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Database Records</p>
                <p className="mt-1 text-2xl font-bold text-slate-200">{dbCount}</p>
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Storage Blobs</p>
                <p className="mt-1 text-2xl font-bold text-slate-200">{storageCount}</p>
              </div>
            </div>

            {/* Status Indicator */}
            {mismatches.dbOnly.length === 0 && mismatches.storageOnly.length === 0 ? (
              <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-emerald-400">
                <span className="material-symbols-outlined text-lg">check_circle</span>
                <span className="text-sm font-semibold">Database and Storage are fully synchronized.</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-amber-400">
                  <span className="material-symbols-outlined text-lg">warning</span>
                  <span className="text-sm font-semibold">
                    Sync Mismatch: {mismatches.storageOnly.length + mismatches.dbOnly.length} orphan(s) detected.
                  </span>
                </div>

                {/* Details */}
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-3 text-xs">
                  {mismatches.storageOnly.length > 0 && (
                    <div>
                      <p className="font-extrabold text-amber-400 uppercase tracking-wide mb-1">
                        In Storage but missing in DB ({mismatches.storageOnly.length})
                      </p>
                      <ul className="list-disc list-inside text-slate-400 space-y-0.5">
                        {mismatches.storageOnly.slice(0, 5).map(f => (
                          <li key={f} className="truncate">{f}</li>
                        ))}
                        {mismatches.storageOnly.length > 5 && <li>...and {mismatches.storageOnly.length - 5} more</li>}
                      </ul>
                      <button
                        onClick={handleRepair}
                        disabled={repairing}
                        className="mt-2.5 rounded-lg bg-blue-500 px-3 py-1.5 font-bold text-white hover:bg-blue-600 transition-colors disabled:opacity-50"
                      >
                        {repairing ? 'Repairing...' : 'Repair Sync (Re-register in DB)'}
                      </button>
                    </div>
                  )}

                  {mismatches.dbOnly.length > 0 && (
                    <div>
                      <p className="font-extrabold text-amber-400 uppercase tracking-wide mb-1">
                        In DB but missing in Storage ({mismatches.dbOnly.length})
                      </p>
                      <ul className="list-disc list-inside text-slate-400 space-y-0.5">
                        {mismatches.dbOnly.slice(0, 5).map(f => (
                          <li key={f} className="truncate">{f}</li>
                        ))}
                        {mismatches.dbOnly.length > 5 && <li>...and {mismatches.dbOnly.length - 5} more</li>}
                      </ul>
                      <button
                        onClick={handlePurgeDbOnly}
                        disabled={repairing}
                        className="mt-2.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 font-bold text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                      >
                        {repairing ? 'Purging...' : 'Purge DB Records'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <button
              onClick={checkSync}
              className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs font-bold text-slate-400 hover:bg-white/10 transition-colors"
            >
              Scan Again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
