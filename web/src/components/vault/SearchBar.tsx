interface SearchBarProps {
  value: string
  onChange: (value: string) => void
}

export default function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative flex-1">
      <span className="material-symbols-outlined pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
        search
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search files, folders, descriptions…"
        className="w-full rounded-2xl border border-white/10 bg-slate-900/50 py-2.5 pl-10 pr-10 text-sm text-white outline-none focus:border-primary/40"
        autoComplete="off"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          title="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 hover:text-slate-300"
        >
          <span className="material-symbols-outlined text-base">close</span>
        </button>
      )}
    </div>
  )
}
