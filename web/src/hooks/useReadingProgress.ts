import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getUserKey } from '../utils/userKey'

const LS_KEY = 'fvReadProgress'

function readAll(): Record<string, { pct: number; ts: number }> {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '{}')
  } catch {
    return {}
  }
}

function writeAll(map: Record<string, { pct: number; ts: number }>) {
  const entries = Object.entries(map)
    .sort((a, b) => b[1].ts - a[1].ts)
    .slice(0, 60)
  localStorage.setItem(LS_KEY, JSON.stringify(Object.fromEntries(entries)))
}

/**
 * Uses the SAME `user_reading_progress` table as the original app:
 *   user_reading_progress (file_url text, user_key text, pct int, updated_at timestamptz)
 *   primary key (file_url, user_key)
 */
export function useReadingProgress(url: string | null) {
  const [pct, setPct] = useState(0)
  const saveTimer = useRef<ReturnType<typeof setTimeout>>()

  // Load cached value instantly, then reconcile with Supabase (cross-device)
  useEffect(() => {
    if (!url) {
      setPct(0)
      return
    }
    const cached = readAll()[url]
    setPct(cached?.pct ?? 0)

    supabase
      .from('user_reading_progress')
      .select('pct')
      .eq('file_url', url)
      .eq('user_key', getUserKey())
      .maybeSingle()
      .then(({ data }) => {
        if (data && typeof data.pct === 'number' && data.pct > (cached?.pct ?? 0)) {
          setPct(data.pct)
          const all = readAll()
          all[url] = { pct: data.pct, ts: Date.now() }
          writeAll(all)
        }
      })
  }, [url])

  const saveProgress = useCallback(
    (newPct: number) => {
      if (!url) return
      const rounded = Math.round(newPct)
      setPct(rounded)
      const all = readAll()
      all[url] = { pct: rounded, ts: Date.now() }
      writeAll(all)

      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        supabase.from('user_reading_progress').upsert(
          { file_url: url, user_key: getUserKey(), pct: rounded, updated_at: new Date().toISOString() },
          { onConflict: 'file_url,user_key' }
        )
      }, 5000)
    },
    [url]
  )

  return { pct, saveProgress }
}
