import { useState } from 'react'
import type { FileComment } from '../../types'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

interface CommentThreadProps {
  comments: FileComment[]
  loading: boolean
  isMine: (c: FileComment) => boolean
  onPost: (body: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onEdit: (id: string, body: string) => Promise<void>
}

export default function CommentThread({ comments, loading, isMine, onPost, onDelete, onEdit }: CommentThreadProps) {
  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')

  async function handlePost() {
    if (!draft.trim() || posting) return
    setPosting(true)
    try {
      await onPost(draft)
      setDraft('')
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="flex flex-col border-t border-white/10">
      <div className="flex items-center justify-between px-4 pb-1.5 pt-2.5">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/25">Comments</span>
        <span className="text-[10px] text-slate-500">
          {loading ? '…' : comments.length ? `${comments.length} comment${comments.length > 1 ? 's' : ''}` : ''}
        </span>
      </div>

      <div className="flex max-h-64 flex-col gap-2 overflow-y-auto px-4 pb-2">
        {!loading && !comments.length && (
          <p className="py-1 text-xs text-slate-500">No comments yet — be the first.</p>
        )}
        {comments.map((c) => {
          const mine = isMine(c)
          const editing = editingId === c.id
          return (
            <div key={c.id} className="rounded-lg border border-white/[0.07] bg-white/[0.04] px-2.5 py-2">
              <div className="mb-0.5 flex items-center gap-1.5 text-[10px] text-slate-500">
                <span className="material-symbols-outlined text-[12px]">person</span>
                <span>{mine ? <b className="text-blue-300">You</b> : 'Student'}</span>
                <span>·</span>
                <span>{timeAgo(c.createdAt)}</span>
                {c.updatedAt && <span className="italic text-slate-600">(edited)</span>}
                {mine && !editing && (
                  <div className="ml-auto flex gap-1">
                    <button
                      onClick={() => {
                        setEditingId(c.id)
                        setEditDraft(c.body)
                      }}
                      className="text-slate-500 hover:text-blue-300"
                      title="Edit"
                    >
                      <span className="material-symbols-outlined text-[12px]">edit</span>
                    </button>
                    <button onClick={() => onDelete(c.id)} className="text-slate-500 hover:text-red-400" title="Delete">
                      <span className="material-symbols-outlined text-[12px]">delete</span>
                    </button>
                  </div>
                )}
              </div>
              {editing ? (
                <div className="flex items-end gap-1.5">
                  <textarea
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    rows={2}
                    className="flex-1 rounded-lg border border-primary/35 bg-white/[0.06] px-2.5 py-1.5 text-xs text-slate-200 outline-none"
                  />
                  <button
                    onClick={async () => {
                      await onEdit(c.id, editDraft)
                      setEditingId(null)
                    }}
                    className="shrink-0 rounded-lg border border-primary/30 bg-primary/20 px-2.5 py-1.5 text-[11px] font-bold text-blue-200"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="shrink-0 rounded-lg border border-white/10 px-2 py-1.5 text-[11px] font-bold text-slate-400"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <p className="break-words text-xs leading-relaxed text-slate-300">{c.body}</p>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex items-end gap-2 px-4 pb-3 pt-1">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask a question or leave a note…"
          rows={2}
          maxLength={500}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              e.preventDefault()
              handlePost()
            }
          }}
          className="flex-1 resize-none rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-2 text-xs text-white outline-none focus:border-primary/40"
        />
        <button
          onClick={handlePost}
          disabled={posting || !draft.trim()}
          className="shrink-0 rounded-lg border border-primary/30 bg-primary/20 px-3.5 py-2 text-xs font-bold text-blue-200 disabled:opacity-40"
        >
          Post
        </button>
      </div>
    </div>
  )
}
