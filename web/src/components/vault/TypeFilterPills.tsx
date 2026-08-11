import type { TypeFilter } from '../../types'

const TYPES: { value: TypeFilter; label: string; icon: string; color: string }[] = [
  { value: null, label: 'All types', icon: 'filter_list', color: '' },
  { value: 'pdf', label: 'PDF', icon: 'picture_as_pdf', color: 'text-red-400' },
  { value: 'pptx', label: 'PPTX', icon: 'slideshow', color: 'text-orange-400' },
  { value: 'docx', label: 'DOCX', icon: 'description', color: 'text-blue-400' },
  { value: 'xlsx', label: 'XLSX', icon: 'table_chart', color: 'text-green-400' },
  { value: 'img', label: 'Images', icon: 'image', color: 'text-purple-400' },
]

interface TypeFilterPillsProps {
  active: TypeFilter
  onChange: (type: TypeFilter) => void
}

export default function TypeFilterPills({ active, onChange }: TypeFilterPillsProps) {
  return (
    <div className="mb-4 flex gap-2 overflow-x-auto pb-1 sm:mb-5">
      {TYPES.map((t) => (
        <button
          key={t.label}
          onClick={() => onChange(t.value)}
          className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition-all ${
            active === t.value
              ? 'border-primary/40 bg-primary/20 text-primary'
              : 'border-white/10 bg-slate-800/40 text-slate-400 hover:border-primary/40 hover:bg-primary/20 hover:text-primary'
          }`}
        >
          <span className={`material-symbols-outlined text-[15px] ${t.color}`}>{t.icon}</span>
          {t.label}
        </button>
      ))}
    </div>
  )
}
