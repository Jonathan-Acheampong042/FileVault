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

  const handleAskAi = () => {
    window.dispatchEvent(new CustomEvent('fv-ask-ai', { detail: file }))
    onClose()
  }

  const handleQuizMe = () => {
    window.dispatchEvent(new CustomEvent('fv-quiz-me', { detail: file }))
    onClose()
  }

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
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-slate-950/90 p-0 sm:p-4 backdrop-blur-md"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex h-full w-full max-w-3xl flex-col overflow-hidden bg-slate-900/95 shadow-2xl sm:h-auto sm:max-h-[90vh] sm:rounded-[1.75rem] sm:border sm:border-white/10">
        {/* ── Header row 1: file info + close ── */}
        <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-3 sm:gap-3 sm:px-4 sm:py-4">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <span className="material-symbols-outlined shrink-0 text-xl text-primary sm:text-2xl">{getFileIcon(file.name)}</span>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-white sm:text-sm">{file.name}</p>
              <p className="text-[10px] text-slate-400 sm:text-[11px]">
                {(file.folder || 'ROOT').toUpperCase()}
                {formatFileSize(file.fileSize) ? ` · ${formatFileSize(file.fileSize)}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400"
            aria-label="Close preview"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* ── Header row 2: action buttons (scrollable on mobile) ── */}
        <div className="flex items-center gap-2 overflow-x-auto border-b border-white/10 px-3 py-2 sm:px-4">
          {onToggleBookmark && (
            <BookmarkButton
              saved={!!isBookmarked?.(file.url)}
              onToggle={() => onToggleBookmark(file.url, file.name, file.folder)}
            />
          )}
          <a
            href={file.url}
            download
            className="flex shrink-0 items-center gap-1.5 rounded-2xl border border-primary/30 bg-primary/20 px-2.5 py-1.5 text-[11px] font-bold text-blue-200 sm:px-3.5 sm:py-2 sm:text-xs"
          >
            <span className="material-symbols-outlined text-base">download</span>
            <span className="hidden xs:inline sm:inline">Download</span>
          </a>
          <button
            onClick={handleAskAi}
            className="flex shrink-0 items-center gap-1 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-bold text-emerald-300 sm:px-3.5 sm:py-2 sm:text-xs"
            title="Ask AI about this file"
          >
            <span className="material-symbols-outlined text-base">smart_toy</span>
            <span className="hidden xs:inline sm:inline">Ask AI</span>
          </button>
          <button
            onClick={handleQuizMe}
            className="flex shrink-0 items-center gap-1 rounded-2xl border border-purple-500/25 bg-purple-500/10 px-2.5 py-1.5 text-[11px] font-bold text-purple-300 sm:px-3.5 sm:py-2 sm:text-xs"
            title="Quiz me on this file"
          >
            <span className="material-symbols-outlined text-base">quiz</span>
            <span className="hidden xs:inline sm:inline">Quiz me</span>
          </button>
        </div>

        {/* ── Content preview ── */}
        <div className="flex min-h-[200px] flex-1 items-center justify-center overflow-auto bg-black/25 sm:min-h-[300px]">
          {isImg ? (
            <img src={file.url} alt={file.name} className="max-h-[50vh] max-w-full object-contain sm:max-h-[70vh] sm:rounded-xl" />
          ) : isPdf ? (
            <iframe src={`${file.url}#toolbar=1`} title={file.name} className="h-[55vh] w-full border-0 sm:h-[70vh]" />
          ) : (
            <div className="p-8 text-center sm:p-12">
              <span className="material-symbols-outlined mb-4 block text-5xl text-white/15 sm:text-6xl">
                {getFileIcon(file.name)}
              </span>
              <p className="mb-5 text-xs text-white/40 sm:text-sm">Preview not available for this file type.</p>
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-primary/20 px-4 py-2 text-xs font-bold text-blue-200 sm:px-5 sm:py-2.5 sm:text-[13px]"
              >
                Open in new tab <span className="material-symbols-outlined text-base">open_in_new</span>
              </a>
            </div>
          )}
        </div>

        {(isPdf || isImg) && <ReadingProgressBar pct={pct} />}

        {file.description && (
          <div className="border-t border-white/10 px-4 py-3 bg-white/[0.01] sm:px-5 sm:py-3.5">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px] text-blue-400">info</span>
              File Description
            </p>
            <p className="text-xs text-slate-300 leading-relaxed italic">{file.description}</p>
          </div>
        )}

        {file.id && (
          <>
            <div className="border-t border-white/10 px-3 py-2.5 sm:px-4 sm:py-3">
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
