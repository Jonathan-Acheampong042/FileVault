import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { VaultFile } from '../types'

const CACHE_KEY = 'fvFilesCache'
const CACHE_TTL = 60 * 1000 // 60s, matches original — short so new uploads show quickly

function getCachedFiles(): VaultFile[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { ts, data } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL) {
      sessionStorage.removeItem(CACHE_KEY)
      return null
    }
    return data
  } catch {
    return null
  }
}

function setCachedFiles(data: VaultFile[]) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }))
  } catch {
    /* storage full or unavailable — non-fatal */
  }
}

export function useFiles() {
  const [files, setFiles] = useState<VaultFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFiles = useCallback(async (useCache = true) => {
    setLoading(true)
    setError(null)
    try {
      if (useCache) {
        const cached = getCachedFiles()
        if (cached) {
          setFiles(cached)
          setLoading(false)
          return
        }
      }
      const { data, error: dbError } = await supabase
        .from('files_list')
        .select('*')
        .order('created_at', { ascending: false })
      if (dbError) throw dbError

      const now = new Date()
      const visible = (data || []).filter(
        (row) => !row.scheduled_at || new Date(row.scheduled_at) <= now
      )
      const mapped: VaultFile[] = visible.map((row) => ({
        id: row.id,
        name: row.file_name,
        folder: row.folder_name && row.folder_name !== 'Root' ? row.folder_name : null,
        url: row.download_url,
        date: row.created_at,
        updatedAt: row.updated_at || null,
        expiresAt: row.expires_at,
        description: row.description || null,
        fileSize: row.file_size || null,
        downloadCount: row.download_count || 0,
      }))
      setFiles(mapped)
      if (mapped.length) setCachedFiles(mapped)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load files.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFiles()
  }, [fetchFiles])

  // Realtime: refresh on any files_list change (insert/update/delete)
  useEffect(() => {
    const channel = supabase
      .channel('filevault-files')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'files_list' }, () => {
        try {
          sessionStorage.removeItem(CACHE_KEY)
        } catch {
          /* ignore */
        }
        fetchFiles(false)
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchFiles])

  return { files, loading, error, refetch: () => fetchFiles(false) }
}
