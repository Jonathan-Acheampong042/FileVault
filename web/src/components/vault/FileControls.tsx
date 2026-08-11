import type { SortType, ViewType } from '../../types'

interface FileControlsProps {
  count: number
  activeFolder: string | null
  onClearFolder: () => void
  viewType: ViewType
  onViewChange: (v: ViewType) => void
  sort: SortType
  onSortChange: (s: SortType) => void
  onSelectAll: () => void
}

export default function FileControls({
  count,
  activeFolder,
  onClearFolder,
  viewType,
  onViewChange,
  sort,
  onSortChange,
  onSelectAll,
}: FileControlsProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
      <div className="flex items-center gap-4">
        <h3 className="text-lg font-bold text-white">Files</h3>
        <span className="rounded-lg bg-white/5 px-2.5 py-0.5 text-[10px] font-bold text-slate-400">{count}</span>
        {activeFolder && (
          <button
            onClick={onClearFolder}
            className="flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary"
          >
            <span className="material-symbols-outlined text-[16px]">folder</span>
            {activeFolder}
            <span className="material-symbols-outlined text-[14px]">close</span>
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onSelectAll}
          className="flex h-10 items-center gap-1.5 rounded-xl bg-white/5 px-3 text-xs font-bold text-slate-400 hover:bg-primary/20 hover:text-primary"
        >
          <span className="material-symbols-outlined text-base">select_all</span>
          <span className="hidden sm:inline">Select All</span>
        </button>
        <button
          onClick={() => onViewChange('grid')}
          className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
            viewType === 'grid' ? 'bg-primary/20 text-primary' : 'bg-slate-900/50 text-slate-300'
          }`}
          title="Grid view"
        >
          <span className="material-symbols-outlined">grid_view</span>
        </button>
        <button
          onClick={() => onViewChange('list')}
          className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
            viewType === 'list' ? 'bg-primary/20 text-primary' : 'bg-slate-900/50 text-slate-300'
          }`}
          title="List view"
        >
          <span className="material-symbols-outlined">view_list</span>
        </button>
      </div>
      <div className="relative">
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortType)}
          className="cursor-pointer rounded-xl border border-white/10 bg-slate-900/50 px-4 py-2 pr-10 text-xs text-slate-300 outline-none"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="name">Name</option>
        </select>
      </div>
    </div>
  )
}
