import type { PinnedFileMeta } from '../../types'
import { getFileIcon } from '../../utils/fileDisplay'

interface PinnedFilesSectionProps {
  pins: PinnedFileMeta[]
  totalBytes: number
  onOpen: (url: string, name: string) => void
  onUnpin: (url: string) => void
  onClearAll: () => void
}

export default function PinnedFilesSection({ pins, totalBytes, onOpen, onUnpin, onClearAll }: PinnedFilesSectionProps) {
  if (!pins.length) return null
  const totalMB = (totalBytes / 1024 / 1024).toFixed(1)

  return (
    <section className="glass-card mb-5 rounded-2xl p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-xl text-amber-400">push_pin</span>
          <h3 className="text-sm font-bold uppercase tracking-wide text-white">Pinned Offline</h3>
          <span className="rounded-lg bg-white/5 px-2 py-0.5 text-[10px] font-bold text-slate-400">{pins.length}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-semibold text-slate-500">{totalMB} MB stored</span>
          <button onClick={onClearAll} className="text-[10px] font-bold text-white/20 hover:text-white/50">
            Clear all
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {pins.map((p) => (
          <div
            key={p.url}
            onClick={() => onOpen(p.url, p.name)}
            className="flex max-w-[220px] cursor-pointer items-center gap-1.5 rounded-lg border border-amber-400/20 bg-amber-500/[0.08] px-2.5 py-1.5"
          >
            <span className="material-symbols-outlined shrink-0 text-[14px] text-amber-400">{getFileIcon(p.name)}</span>
            <span className="flex-1 truncate text-[11px] font-semibold text-amber-400">{p.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onUnpin(p.url)
              }}
              title="Unpin"
              className="shrink-0 text-stone-500"
            >
              <span className="material-symbols-outlined text-[13px]">close</span>
            </button>
          </div>
        ))}
      </div>
      <p className="mt-2.5 text-[11px] leading-relaxed text-slate-500">
        <span className="material-symbols-outlined align-middle text-[12px]">wifi_off</span> Pinned files are stored
        on your device and open even without internet.
      </p>
    </section>
  )
}
