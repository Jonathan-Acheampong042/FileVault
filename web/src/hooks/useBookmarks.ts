import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { BookmarkEntry } from '../types'

const LS_KEY = 'fvBookmarks'
const MAX_BOOKMARKS = 50

function readLocal(): BookmarkEntry[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(LS_KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeLocal(entries: BookmarkEntry[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(entries))
}

/**
 * Uses the SAME `user_bookmarks` table + RLS policies as the original app:
 *   user_bookmarks (user_id uuid, file_url text, name text, folder text, created_at timestamptz)
 *   primary key (user_id, file_url)
 * No schema changes needed if you're pointed at the same Supabase project.
 */
export function useBookmarks() {
  const { session } = useAuth()
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>(readLocal)

  // Pull remote bookmarks once per login and merge with local (additive both ways),
  // mirroring syncBookmarksOnLogin() in the original app.
  useEffect(() => {
    if (!session) return
    let cancelled = false
    ;(async () => {
      const { data: remote, error } = await supabase
        .from('user_bookmarks')
        .select('file_url, name, folder, created_at')
        .eq('user_id', session.user.id)
      if (error || !remote || cancelled) return

      setBookmarks((local) => {
        const localUrls = new Set(local.map((b) => b.url))
        const merged = [...local]
        remote.forEach((r) => {
          if (!localUrls.has(r.file_url)) {
            merged.unshift({
              url: r.file_url,
              name: r.name,
              folder: r.folder,
              ts: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
            })
          }
        })
        merged.sort((a, b) => b.ts - a.ts)
        const trimmed = merged.slice(0, MAX_BOOKMARKS)
        writeLocal(trimmed)

        // Push up any local-only bookmarks (made while signed out) that the account lacks
        const remoteUrls = new Set(remote.map((r) => r.file_url))
        local
          .filter((b) => !remoteUrls.has(b.url))
          .forEach((b) => {
            supabase
              .from('user_bookmarks')
              .upsert(
                { user_id: session.user.id, file_url: b.url, name: b.name, folder: b.folder },
                { onConflict: 'user_id,file_url' }
              )
              .then(() => {})
          })

        return trimmed
      })
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id])

  const isBookmarked = useCallback((url: string) => bookmarks.some((b) => b.url === url), [bookmarks])

  const toggle = useCallback(
    (url: string, name: string, folder: string | null) => {
      const already = bookmarks.some((b) => b.url === url)
      let next: BookmarkEntry[]
      if (already) {
        next = bookmarks.filter((b) => b.url !== url)
      } else {
        next = [{ url, name, folder, ts: Date.now() }, ...bookmarks].slice(0, MAX_BOOKMARKS)
      }
      setBookmarks(next)
      writeLocal(next)

      if (session) {
        if (already) {
          supabase.from('user_bookmarks').delete().eq('user_id', session.user.id).eq('file_url', url)
        } else {
          supabase
            .from('user_bookmarks')
            .upsert({ user_id: session.user.id, file_url: url, name, folder }, { onConflict: 'user_id,file_url' })
        }
      }
      return !already
    },
    [bookmarks, session]
  )

  return { bookmarks, isBookmarked, toggle }
}
