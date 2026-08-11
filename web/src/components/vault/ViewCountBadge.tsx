interface ViewCountBadgeProps {
  count: number
}

export default function ViewCountBadge({ count }: ViewCountBadgeProps) {
  if (!count) return null
  return (
    <span
      title={`${count} student${count !== 1 ? 's' : ''} opened this`}
      className="inline-flex items-center gap-1 rounded-full border border-violet-400/20 bg-violet-500/10 px-2 py-0.5 text-[10px] font-bold text-violet-300"
    >
      <span className="material-symbols-outlined text-[11px]">visibility</span>
      {count}
    </span>
  )
}
