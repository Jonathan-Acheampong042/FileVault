interface ReadingProgressBarProps {
  pct: number
}

export default function ReadingProgressBar({ pct }: ReadingProgressBarProps) {
  return (
    <div className="border-t border-white/5 bg-black/10 px-4 py-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Reading Progress</span>
        <span className="text-[10px] font-bold text-slate-400">{pct}%</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-white/[0.07]">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--accent, #3b82f6), #8b5cf6)' }}
        />
      </div>
    </div>
  )
}
