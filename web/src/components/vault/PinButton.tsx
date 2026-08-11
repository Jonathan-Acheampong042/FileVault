interface PinButtonProps {
  pinned: boolean
  onToggle: (e: React.MouseEvent) => void
}

export default function PinButton({ pinned, onToggle }: PinButtonProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onToggle(e)
      }}
      title={pinned ? 'Unpin (remove offline copy)' : 'Pin for offline access'}
      aria-label="Pin for offline"
      className={`rounded-xl p-2 transition-colors ${
        pinned ? 'text-amber-400' : 'text-slate-400 hover:bg-amber-400/10 hover:text-amber-400'
      }`}
    >
      <span className="material-symbols-outlined text-xl">{pinned ? 'push_pin' : 'keep'}</span>
    </button>
  )
}
