import { useCallback, useMemo, useState } from 'react'
import type { RecentlyViewedEntry, VaultFile } from '../types'

const LS_KEY = 'fvRecentViewed'
const MAX_ENTRIES = 12

function readLocal(): RecentlyViewedEntry[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(LS_KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function useRecentlyViewed() {
  const [entries, setEntries] = useState<RecentlyViewedEntry[]>(readLocal)

  const addView = useCallback((url: string, name: string, folder: string | null) => {
    setEntries((prev) => {
      const next = [{ url, name, folder, viewedAt: Date.now() }, ...prev.filter((e) => e.url !== url)].slice(
        0,
        MAX_ENTRIES
      )
      localStorage.setItem(LS_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const clear = useCallback(() => {
    localStorage.removeItem(LS_KEY)
    setEntries([])
  }, [])

  return { entries, addView, clear }
}

/**
 * "Suggested for you" — scores unseen files by matching folder/extension
 * against the last 5 recently-viewed entries. Mirrors the original app's
 * renderSuggested() scoring logic.
 */
export function useSuggestedFiles(allFiles: VaultFile[], recentlyViewed: RecentlyViewedEntry[]) {
  return useMemo(() => {
    if (!recentlyViewed.length || !allFiles.length) return []
    const viewedUrls = new Set(recentlyViewed.map((r) => r.url))
    const now = new Date()
    const scored = new Map<string, { file: VaultFile; score: number }>()

    recentlyViewed.slice(0, 5).forEach((viewed) => {
      const viewedExt = viewed.name.split('.').pop()?.toLowerCase()
      allFiles.forEach((f) => {
        if (viewedUrls.has(f.url)) return
        if (f.expiresAt && new Date(f.expiresAt) <= now) return
        let score = 0
        if (f.folder && f.folder === viewed.folder) score += 2
        if (f.name.split('.').pop()?.toLowerCase() === viewedExt) score += 1
        if (score > 0) {
          const existing = scored.get(f.url)
          scored.set(f.url, { file: f, score: (existing?.score || 0) + score })
        }
      })
    })

    return Array.from(scored.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((s) => s.file)
  }, [allFiles, recentlyViewed])
}
