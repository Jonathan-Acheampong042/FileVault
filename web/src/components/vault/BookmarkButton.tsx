interface BookmarkButtonProps {
  saved: boolean
  onToggle: () => void
}

export default function BookmarkButton({ saved, onToggle }: BookmarkButtonProps) {
  return (
    <button
      onClick={onToggle}
      title="Bookmark this file"
      className={`flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-xs font-bold transition-colors ${
        saved
          ? 'border-amber-400/50 bg-amber-500/25 text-amber-300'
          : 'border-amber-400/25 bg-amber-500/10 text-amber-300/80'
      }`}
    >
      <span className="material-symbols-outlined text-base">{saved ? 'bookmark' : 'bookmark_border'}</span>
      {saved ? 'Saved' : 'Save'}
    </button>
  )
}
