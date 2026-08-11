import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getUserKey } from '../utils/userKey'

/**
 * Table: file_views (file_id text, user_key text, last_viewed timestamptz)
 * Unique constraint on (file_id, user_key) — one view counted per distinct
 * student, not per open, so re-opening the same file doesn't inflate counts.
 */
export function useViewCounts(fileIds: string[]) {
  const [counts, setCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    const missing = fileIds.filter((id) => !(id in counts))
    if (!missing.length) return
    supabase
      .from('file_views')
      .select('file_id')
      .in('file_id', missing)
      .then(({ data }) => {
        if (!data) return
        const next: Record<string, number> = {}
        data.forEach((r) => {
          next[r.file_id] = (next[r.file_id] || 0) + 1
        })
        setCounts((prev) => ({ ...prev, ...next, ...Object.fromEntries(missing.filter((id) => !(id in next)).map((id) => [id, 0])) }))
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileIds.join(',')])

  return counts
}

export async function trackView(fileId: string) {
  try {
    const userKey = getUserKey()
    await supabase
      .from('file_views')
      .upsert(
        { file_id: fileId, user_key: userKey, last_viewed: new Date().toISOString() },
        { onConflict: 'file_id,user_key' }
      )
  } catch {
    // non-critical — view tracking failures shouldn't block preview
  }
}
