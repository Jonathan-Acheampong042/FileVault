import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { AppNotification } from '../types'

interface NotificationRow {
  id: string
  user_id: string | null
  type: string
  title: string
  body: string | null
  created_at: string
  read: boolean
  link_url: string | null
}

function mapRow(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
    read: row.read,
    linkUrl: row.link_url,
  }
}

/**
 * Uses the SAME `notifications` table as the original app:
 *   notifications (id uuid, user_id uuid null, type text, title text, body text,
 *                  created_at timestamptz, read boolean, link_url text, metadata jsonb)
 * Rows with a null user_id are treated as broadcast (e.g. announcements fanned
 * out to everyone) and shown to every signed-in user, same as the original.
 */
export function useNotifications() {
  const { session } = useAuth()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!session) {
      setNotifications([])
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, user_id, type, title, body, created_at, read, link_url')
        .or(`user_id.eq.${session.user.id},user_id.is.null`)
        .order('created_at', { ascending: false })
        .limit(30)
      if (error) throw error
      setNotifications((data || []).map(mapRow))
    } catch {
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    load()
  }, [load])

  // Realtime: new/updated/deleted notification rows for this user
  useEffect(() => {
    if (!session) return
    const channel = supabase
      .channel(`filevault-notifications-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, (payload) => {
        const row = (payload.new || payload.old) as NotificationRow | undefined
        if (row?.user_id && row.user_id !== session.user.id) return
        load()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [session, load])

  const unreadCount = notifications.filter((n) => !n.read).length

  const markRead = useCallback(async (id: string, read = true) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read } : n)))
    await supabase.from('notifications').update({ read }).eq('id', id)
  }, [])

  const markAllRead = useCallback(async () => {
    if (!session) return
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    await supabase.from('notifications').update({ read: true }).eq('user_id', session.user.id).eq('read', false)
  }, [session])

  const remove = useCallback(async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    await supabase.from('notifications').delete().eq('id', id)
  }, [])

  return { notifications, unreadCount, loading, markRead, markAllRead, remove, refetch: load }
}
