import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getUserKey } from '../utils/userKey'
import type { ReactionMap } from '../types'

/**
 * Table: file_reactions (file_id text, user_key text, emoji text, created_at timestamptz)
 * Unique constraint on (file_id, user_key, emoji) — a student can react with
 * more than one distinct emoji, but not the same emoji twice.
 */
export function useReactions(fileId: string | null) {
  const [reactions, setReactions] = useState<ReactionMap>({})
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (id: string) => {
    setLoading(true)
    try {
      const userKey = getUserKey()
      const [{ data: allRows }, { data: myRows }] = await Promise.all([
        supabase.from('file_reactions').select('emoji').eq('file_id', id),
        supabase.from('file_reactions').select('emoji').eq('file_id', id).eq('user_key', userKey),
      ])
      const mySet = new Set((myRows || []).map((r) => r.emoji))
      const counts: Record<string, number> = {}
      ;(allRows || []).forEach((r) => {
        counts[r.emoji] = (counts[r.emoji] || 0) + 1
      })
      const map: ReactionMap = {}
      Object.keys(counts).forEach((emoji) => {
        map[emoji] = { count: counts[emoji], mine: mySet.has(emoji) }
      })
      // Make sure emojis the user picked (even with count already captured) are present
      mySet.forEach((emoji) => {
        if (!map[emoji]) map[emoji] = { count: counts[emoji] || 1, mine: true }
      })
      setReactions(map)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (fileId) load(fileId)
    else setReactions({})
  }, [fileId, load])

  const toggle = useCallback(
    async (emoji: string) => {
      if (!fileId) return
      const userKey = getUserKey()
      const current = reactions[emoji] || { count: 0, mine: false }
      const nextMine = !current.mine
      setReactions((prev) => ({
        ...prev,
        [emoji]: { count: Math.max(0, current.count + (nextMine ? 1 : -1)), mine: nextMine },
      }))
      try {
        if (nextMine) {
          await supabase
            .from('file_reactions')
            .upsert({ file_id: fileId, user_key: userKey, emoji }, { onConflict: 'file_id,user_key,emoji' })
        } else {
          await supabase
            .from('file_reactions')
            .delete()
            .eq('file_id', fileId)
            .eq('user_key', userKey)
            .eq('emoji', emoji)
        }
      } catch {
        setReactions((prev) => ({ ...prev, [emoji]: current }))
      }
    },
    [fileId, reactions]
  )

  return { reactions, toggle, loading }
}
