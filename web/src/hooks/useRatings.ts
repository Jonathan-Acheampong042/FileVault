import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getUserKey } from '../utils/userKey'
import type { RatingState } from '../types'

/**
 * Table: file_ratings (file_id text, user_key text, created_at timestamptz)
 * Unique constraint on (file_id, user_key).
 */
export function useRatings(fileIds: string[]) {
  const [ratings, setRatings] = useState<Record<string, RatingState>>({})

  const load = useCallback(async (ids: string[]) => {
    if (!ids.length) return
    const userKey = getUserKey()
    const { data: allRows } = await supabase.from('file_ratings').select('file_id').in('file_id', ids)
    const { data: myRows } = await supabase
      .from('file_ratings')
      .select('file_id')
      .in('file_id', ids)
      .eq('user_key', userKey)
    const mySet = new Set((myRows || []).map((r) => r.file_id))
    const counts: Record<string, number> = {}
    ;(allRows || []).forEach((r) => {
      counts[r.file_id] = (counts[r.file_id] || 0) + 1
    })
    setRatings((prev) => {
      const next = { ...prev }
      ids.forEach((id) => {
        next[id] = { count: counts[id] || 0, mine: mySet.has(id) }
      })
      return next
    })
  }, [])

  useEffect(() => {
    load(fileIds.filter((id) => !(id in ratings)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileIds.join(',')])

  const toggle = useCallback(async (fileId: string) => {
    const userKey = getUserKey()
    const current = ratings[fileId] || { count: 0, mine: false }
    const nextMine = !current.mine
    const optimistic: RatingState = {
      count: Math.max(0, current.count + (nextMine ? 1 : -1)),
      mine: nextMine,
    }
    setRatings((prev) => ({ ...prev, [fileId]: optimistic }))
    try {
      if (nextMine) {
        await supabase.from('file_ratings').upsert(
          { file_id: fileId, user_key: userKey },
          { onConflict: 'file_id,user_key' }
        )
      } else {
        await supabase.from('file_ratings').delete().eq('file_id', fileId).eq('user_key', userKey)
      }
    } catch {
      // rollback on failure
      setRatings((prev) => ({ ...prev, [fileId]: current }))
    }
  }, [ratings])

  return { ratings, toggle }
}
