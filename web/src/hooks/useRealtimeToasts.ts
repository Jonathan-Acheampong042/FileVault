import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'

interface FilesListRow {
  file_name: string
  folder_name: string | null
  scheduled_at: string | null
}

interface AnnouncementRow {
  message: string
  status: string | null
}

/**
 * Subscribes to `files_list` INSERT and `announcements` INSERT/UPDATE and
 * surfaces a toast the moment they happen — no page refresh needed. This is
 * separate from useFiles()'s own Realtime subscription (which just refetches
 * the file list); this one is purely for the notification UX.
 */
export function useRealtimeToasts() {
  const showToast = useToast()
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    const channel = supabase
      .channel(`filevault-realtime-toasts-${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'files_list' }, (payload) => {
        const row = payload.new as FilesListRow
        if (row.scheduled_at && new Date(row.scheduled_at) > new Date()) return // not visible yet
        clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
          const folder = row.folder_name && row.folder_name !== 'Root' ? ` in ${row.folder_name}` : ''
          showToast(`📁 ${row.file_name}${folder} was just added!`, 'info', 5000)
        }, 800) // debounce multi-file batch uploads, same as the original
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, (payload) => {
        const row = payload.new as AnnouncementRow
        if ((row.status || 'published') !== 'published') return
        showToast(`📢 ${row.message}`, 'info', 5000)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'announcements' }, (payload) => {
        const oldRow = payload.old as AnnouncementRow
        const newRow = payload.new as AnnouncementRow
        if (oldRow.status === 'draft' && newRow.status === 'published') {
          showToast(`📢 ${newRow.message}`, 'info', 5000)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [showToast])
}
