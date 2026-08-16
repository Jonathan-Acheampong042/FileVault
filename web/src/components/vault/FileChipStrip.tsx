import { getFileIcon } from '../../utils/fileDisplay'

interface ChipItem {
  url: string
  name: string
  folder?: string | null
}

interface FileChipStripProps {
  title: string
  icon: string
  iconColorClass: string
  items: ChipItem[]
  onOpen: (item: ChipItem) => void
  onClear?: () => void
  emptyFallback?: null // renders nothing when empty — these sections hide themselves
}

export default function FileChipStrip({ title, icon, iconColorClass, items, onOpen, onClear }: FileChipStripProps) {
  if (!items.length) return null

  return (
    <section className="glass-card mb-5 rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`material-symbols-outlined text-xl ${iconColorClass}`}>{icon}</span>
          <h3 className="text-sm font-bold uppercase tracking-wide text-white">{title}</h3>
        </div>
        {onClear && (
          <button onClick={onClear} className="text-[10px] font-bold text-white/20 hover:text-white/50">
            Clear
          </button>
        )}
      </div>
      <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-x-visible sm:pb-0">
        {items.slice(0, 8).map((item) => (
          <button
            key={item.url}
            onClick={() => onOpen(item)}
            title={item.name}
            className="flex shrink-0 max-w-[200px] items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.04] px-2.5 py-1.5 text-[11px] text-slate-400 transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
          >
            <span className="material-symbols-outlined shrink-0 text-[13px]">{getFileIcon(item.name)}</span>
            <span className="truncate">{item.name}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
