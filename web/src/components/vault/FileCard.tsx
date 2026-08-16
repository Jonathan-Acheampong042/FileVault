import { useState } from 'react'
import type { VaultFile } from '../../types'
import { formatFileSize, getFileColorClasses, getFileIcon, isNewFile, timeAgo } from '../../utils/fileDisplay'
import { useToast } from '../../context/ToastContext'
import { supabase } from '../../lib/supabase'
import { useReactions } from '../../hooks/useReactions'
import RatingBadge from './RatingBadge'
import ViewCountBadge from './ViewCountBadge'
import PinButton from './PinButton'
import ReactionBar from './ReactionBar'
import { haptic } from '../../utils/haptics'

interface FileCardProps {
  file: VaultFile
  selected: boolean
  onToggleSelect: (file: VaultFile, checked: boolean) => void
  onPreview: (file: VaultFile) => void
  rating?: { count: number; mine: boolean }
  onToggleRating?: (fileId: string) => void
  viewCount?: number
  pinned?: boolean
  onTogglePin?: (file: VaultFile) => void
}

export default function FileCard({
  file,
  selected,
  onToggleSelect,
  onPreview,
  rating,
  onToggleRating,
  viewCount,
  pinned,
  onTogglePin,
}: FileCardProps) {
  const showToast = useToast()
  const { reactions, toggle: toggleReaction } = useReactions(file.id ?? null)
  const [copied, setCopied] = useState(false)

  const sizeLabel = formatFileSize(file.fileSize)
  const expiryDays = file.expiresAt
    ? Math.ceil((new Date(file.expiresAt).getTime() - Date.now()) / 86400000)
    : null

  function handleCopyLink(e: React.MouseEvent) {
    e.stopPropagation()
    navigator.clipboard
      .writeText(file.url)
      .then(() => {
        setCopied(true)
        haptic('light')
        showToast('🔗 Link copied to clipboard!', 'success', 2200)
        setTimeout(() => setCopied(false), 1500)
      })
      .catch(() => window.prompt('Copy this file link:', file.url))
  }

  function handleDownload(e: React.MouseEvent) {
    e.stopPropagation()
    haptic('success')
    showToast(`Downloading ${file.name}`, 'success', 2500)
    if (file.id) {
      // Fire-and-forget download counter
      supabase.rpc('increment_download_count', { file_id: file.id }).then(() => {}, () => {
        /* swallow — non-critical analytics */
      })
    }
  }

  return (
    <div
      className="file-card glass-card group flex items-center gap-2.5 rounded-card p-3 cursor-pointer sm:gap-3 sm:p-4"
      onClick={() => onPreview(file)}
      data-file-id={file.id ?? undefined}
    >
      <input
        type="checkbox"
        checked={selected}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onToggleSelect(file, e.target.checked)}
        className="h-4 w-4 shrink-0 cursor-pointer rounded-md text-primary"
        aria-label={`Select ${file.name}`}
      />

      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${getFileColorClasses(file.name)}`}>
        <span className="material-symbols-outlined text-xl">{getFileIcon(file.name)}</span>
      </div>

      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="truncate text-sm font-semibold leading-snug text-white">
          {file.name}
          {isNewFile(file.date) && (
            <span className="badge-new ml-1 inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-extrabold tracking-wide text-emerald-400">
              NEW
            </span>
          )}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] text-slate-500">
          <span className="max-w-[100px] truncate uppercase">{file.folder || 'ROOT'}</span>
          {sizeLabel && (
            <>
              <span>·</span>
              <span className="font-medium text-slate-400">{sizeLabel}</span>
            </>
          )}
          <span>·</span>
          <span title={file.date}>{timeAgo(file.date)}</span>
          {expiryDays !== null && (
            <span className="ml-auto rounded bg-amber-500/10 px-2 py-0.5 text-[9px] text-amber-500">
              Exp: {expiryDays}d
            </span>
          )}
          {typeof viewCount === 'number' && viewCount > 0 && <ViewCountBadge count={viewCount} />}
          {file.id && rating && onToggleRating && (
            <RatingBadge 
              count={rating.count} 
              mine={rating.mine} 
              onToggle={() => {
                haptic('light')
                onToggleRating(file.id!)
              }} 
            />
          )}
        </div>
        {file.description && (
          <p className="mt-0.5 truncate text-[11px] italic text-slate-400">{file.description}</p>
        )}
        {file.id && (
          <div className="mt-2" onClick={(e) => e.stopPropagation()}>
            <ReactionBar reactions={reactions} onToggle={toggleReaction} />
          </div>
        )}
      </div>

      <div className="hidden shrink-0 gap-0.5 sm:flex">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onPreview(file)
          }}
          className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-primary/10 hover:text-primary"
          title="Preview"
          aria-label={`Preview ${file.name}`}
        >
          <span className="material-symbols-outlined text-xl">visibility</span>
        </button>
        <button
          onClick={handleCopyLink}
          className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-primary/10 hover:text-primary"
          title="Copy link"
          aria-label={`Copy link for ${file.name}`}
        >
          <span className="material-symbols-outlined text-xl">{copied ? 'check' : 'link'}</span>
        </button>
        <a
          href={file.url}
          download
          onClick={handleDownload}
          className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-green-400/10 hover:text-green-400"
          title="Download"
          aria-label={`Download ${file.name}`}
        >
          <span className="material-symbols-outlined text-xl">download</span>
        </a>
        {onTogglePin && (
          <PinButton 
            pinned={!!pinned} 
            onToggle={() => {
              haptic('light')
              onTogglePin(file)
            }} 
          />
        )}
      </div>
      {/* Mobile tap indicator */}
      <span className="material-symbols-outlined shrink-0 text-lg text-slate-600 sm:hidden">chevron_right</span>
    </div>
  )
}
