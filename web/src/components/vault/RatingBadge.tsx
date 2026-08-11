interface RatingBadgeProps {
  count: number
  mine: boolean
  onToggle: () => void
}

export default function RatingBadge({ count, mine, onToggle }: RatingBadgeProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      title={mine ? 'Unlike' : 'Like this file'}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold transition-all ${
        mine
          ? 'border-amber-400/45 bg-amber-500/20 text-amber-300'
          : 'border-white/10 bg-amber-500/[0.06] text-slate-400 hover:bg-amber-500/15'
      }`}
    >
      👍 {count > 0 ? count : ''}
    </button>
  )
}
