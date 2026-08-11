import { useSettings, ACCENT_SWATCHES } from '../../context/SettingsContext'

interface SettingsPanelProps {
  open: boolean
  onClose: () => void
}

export default function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const { theme, highContrast, fontSize, accent, compactView, toggleTheme, toggleHighContrast, setFontSize, setAccent, toggleCompactView } =
    useSettings()

  if (!open) return null

  return (
    <div className="absolute right-0 top-[60px] z-[99990] w-64 rounded-[20px] border border-white/10 bg-slate-900/95 p-5 shadow-2xl backdrop-blur-2xl">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-bold text-white">Display Settings</p>
        <button onClick={onClose} aria-label="Close display settings" className="text-slate-500">
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>

      <div className="mb-3">
        <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Theme</span>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-300">Light / Dark mode</span>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-slate-400"
          >
            <span className="material-symbols-outlined text-[15px]">
              {theme === 'light' ? 'dark_mode' : 'light_mode'}
            </span>
            Toggle
          </button>
        </div>
      </div>

      <div className="mb-3">
        <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-400">High Contrast</span>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-300">Accessibility mode</span>
          <button
            onClick={toggleHighContrast}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-bold ${
              highContrast ? 'border-white/40 bg-white/20 text-white' : 'border-white/10 bg-white/5 text-slate-400'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">contrast</span>
            {highContrast ? 'On' : 'Off'}
          </button>
        </div>
      </div>

      <div className="mb-3">
        <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Font Size</span>
        <div className="flex items-center gap-1.5">
          {(['small', 'medium', 'large'] as const).map((size) => (
            <button
              key={size}
              onClick={() => setFontSize(size)}
              aria-pressed={fontSize === size}
              className={`flex h-7 w-8 items-center justify-center rounded-lg border text-xs font-bold ${
                fontSize === size
                  ? 'border-primary/40 bg-primary/20 text-primary'
                  : 'border-white/10 bg-white/5 text-slate-400'
              }`}
            >
              A
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3">
        <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Accent Color</span>
        <div className="flex flex-wrap gap-2">
          {ACCENT_SWATCHES.map((swatch) => (
            <button
              key={swatch.color}
              onClick={() => setAccent(swatch)}
              title={swatch.label}
              style={{ background: swatch.color }}
              className={`h-7 w-7 shrink-0 rounded-full border-2 transition-transform ${
                accent.color === swatch.color ? 'scale-115 border-white' : 'border-transparent'
              }`}
            />
          ))}
        </div>
      </div>

      <div>
        <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Compact View</span>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-300">Reduced spacing</span>
          <button
            onClick={toggleCompactView}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-bold ${
              compactView ? 'border-primary/40 bg-primary/20 text-primary' : 'border-white/10 bg-white/5 text-slate-400'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">density_small</span>
            {compactView ? 'On' : 'Off'}
          </button>
        </div>
      </div>
    </div>
  )
}
