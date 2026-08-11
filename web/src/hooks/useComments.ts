import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getUserKey } from '../utils/userKey'
import { useAuth } from '../context/AuthContext'
import type { FileComment } from '../types'

interface CommentRow {
  id: string
  file_id: string
  file_name: string | null
  user_key: string
  user_id: string | null
  body: string
  created_at: string
  updated_at: string | null
}

function mapRow(row: CommentRow): FileComment {
  return {
    id: row.id,
    fileId: row.file_id,
    fileName: row.file_name,
    userKey: row.user_key,
    userId: row.user_id,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * Table: file_comments (id uuid pk, file_id text, file_name text, user_key text,
 * user_id uuid null, body text, created_at timestamptz, updated_at timestamptz null)
 */
export function useComments(fileId: string | null, fileName: string | null) {
  const { session } = useAuth()
  const [comments, setComments] = useState<FileComment[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (id: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('file_comments')
        .select('*')
        .eq('file_id', id)
        .order('created_at', { ascending: true })
      if (error) throw error
      setComments((data || []).map(mapRow))
    } catch {
      setComments([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (fileId) load(fileId)
    else setComments([])
  }, [fileId, load])

  const isMine = useCallback(
    (comment: FileComment) => comment.userKey === getUserKey() || (!!session && comment.userId === session.user.id),
    [session]
  )

  const post = useCallback(
    async (body: string) => {
      if (!fileId || !body.trim()) return
      const payload: Record<string, unknown> = {
        file_id: fileId,
        file_name: fileName,
        user_key: getUserKey(),
        body: body.trim().slice(0, 500),
      }
      if (session) payload.user_id = session.user.id
      const { error } = await supabase.from('file_comments').insert(payload)
      if (error) throw error
      await load(fileId)
    },
    [fileId, fileName, session, load]
  )

  const remove = useCallback(
    async (commentId: string) => {
      if (!fileId) return
      await supabase.from('file_comments').delete().eq('id', commentId).eq('user_key', getUserKey())
      setComments((prev) => prev.filter((c) => c.id !== commentId))
    },
    [fileId]
  )

  const edit = useCallback(
    async (commentId: string, newBody: string) => {
      if (!fileId || !newBody.trim()) return
      await supabase
        .from('file_comments')
        .update({ body: newBody.trim().slice(0, 500), updated_at: new Date().toISOString() })
        .eq('id', commentId)
        .eq('user_key', getUserKey())
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, body: newBody.trim(), updatedAt: new Date().toISOString() } : c))
      )
    },
    [fileId]
  )

  return { comments, loading, post, remove, edit, isMine }
}
