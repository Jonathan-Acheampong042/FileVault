interface FolderGridProps {
  folders: { name: string; count: number }[]
  activeFolder: string | null
  onSelect: (folder: string | null) => void
}

export default function FolderGrid({ folders, activeFolder, onSelect }: FolderGridProps) {
  if (!folders.length) {
    return <p className="col-span-full text-sm italic text-slate-500">No folders yet.</p>
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
      {folders.map((folder) => {
        const active = activeFolder === folder.name
        return (
          <button
            key={folder.name}
            onClick={() => onSelect(active ? null : folder.name)}
            className={`group flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-all ${
              active
                ? 'border-primary/40 bg-primary/10'
                : 'border-white/[0.06] bg-white/[0.03] hover:border-primary/40 hover:bg-primary/5'
            }`}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xl text-primary">
              <span className="material-symbols-outlined">folder</span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{folder.name}</p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {folder.count} file{folder.count !== 1 ? 's' : ''}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
