import { useEffect } from 'react'
import type { VaultFile } from '../../types'
import { formatFileSize, getFileIcon } from '../../utils/fileDisplay'
import { useReactions } from '../../hooks/useReactions'
import { useComments } from '../../hooks/useComments'
import { trackView } from '../../hooks/useViewCounts'
import { useReadingProgress } from '../../hooks/useReadingProgress'
import ReactionBar from './ReactionBar'
import CommentThread from './CommentThread'
import BookmarkButton from './BookmarkButton'
import ReadingProgressBar from './ReadingProgressBar'

interface PreviewModalProps {
  file: VaultFile | null
  onClose: () => void
  isBookmarked?: (url: string) => boolean
  onToggleBookmark?: (url: string, name: string, folder: string | null) => void
  onViewed?: (url: string, name: string, folder: string | null) => void
}

export default function PreviewModal({ file, onClose, isBookmarked, onToggleBookmark, onViewed }: PreviewModalProps) {
  const { reactions, toggle: toggleReaction } = useReactions(file?.id ?? null)
  const { comments, loading: commentsLoading, post, remove, edit, isMine } = useComments(
    file?.id ?? null,
    file?.name ?? null
  )
  const ext = file?.name.split('.').pop()?.toLowerCase() ?? ''
  const isImg = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)
  const isPdf = ext === 'pdf'
  const { pct, saveProgress } = useReadingProgress(isPdf || isImg ? file?.url ?? null : null)

  useEffect(() => {
    if (!file) return
    document.body.style.overflow = 'hidden'
    if (file.id) trackView(file.id)
    onViewed?.(file.url, file.name, file.folder)
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, onClose])

  // Time-based pseudo-progress for PDFs (matches the original's 30s-grace-period timer)
  useEffect(() => {
    if (!isPdf || !file) return
    const delay = setTimeout(() => {
      const interval = setInterval(() => {
        saveProgress(Math.min(99, pct + 1))
      }, 3000)
      return () => clearInterval(interval)
    }, 30000)
    return () => clearTimeout(delay)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPdf, file?.url])

  if (!file) return null

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-900/95 shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="material-symbols-outlined shrink-0 text-2xl text-primary">{getFileIcon(file.name)}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">{file.name}</p>
              <p className="text-[11px] text-slate-400">
                {(file.folder || 'ROOT').toUpperCase()}
                {formatFileSize(file.fileSize) ? ` · ${formatFileSize(file.fileSize)}` : ''}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {onToggleBookmark && (
              <BookmarkButton
                saved={!!isBookmarked?.(file.url)}
                onToggle={() => onToggleBookmark(file.url, file.name, file.folder)}
              />
            )}
            <a
              href={file.url}
              download
              className="flex items-center gap-1.5 rounded-2xl border border-primary/30 bg-primary/20 px-3.5 py-2 text-xs font-bold text-blue-200"
            >
              <span className="material-symbols-outlined text-base">download</span> Download
            </a>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400"
              aria-label="Close preview"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>

        <div className="flex min-h-[300px] flex-1 items-center justify-center overflow-auto bg-black/25">
          {isImg ? (
            <img src={file.url} alt={file.name} className="max-h-[70vh] max-w-full rounded-xl object-contain" />
          ) : isPdf ? (
            <iframe src={`${file.url}#toolbar=1`} title={file.name} className="h-[70vh] w-full border-0" />
          ) : (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined mb-4 block text-6xl text-white/15">
                {getFileIcon(file.name)}
              </span>
              <p className="mb-5 text-sm text-white/40">Preview not available for this file type.</p>
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-primary/20 px-5 py-2.5 text-[13px] font-bold text-blue-200"
              >
                Open in new tab <span className="material-symbols-outlined text-base">open_in_new</span>
              </a>
            </div>
          )}
        </div>

        {(isPdf || isImg) && <ReadingProgressBar pct={pct} />}

        {file.id && (
          <>
            <div className="border-t border-white/10 px-4 py-3">
              <ReactionBar reactions={reactions} onToggle={toggleReaction} />
            </div>
            <CommentThread
              comments={comments}
              loading={commentsLoading}
              isMine={isMine}
              onPost={post}
              onDelete={remove}
              onEdit={edit}
            />
          </>
        )}
      </div>
    </div>
  )
}
