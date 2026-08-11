import type { VaultFile } from '../../types'
import { useToast } from '../../context/ToastContext'

interface BulkBarProps {
  selected: VaultFile[]
  onClear: () => void
}

export default function BulkBar({ selected, onClear }: BulkBarProps) {
  const showToast = useToast()
  if (!selected.length) return null

  const totalBytes = selected.reduce((sum, f) => sum + (f.fileSize || 0), 0)
  const sizeStr = totalBytes > 0 ? ` · ${(totalBytes / 1024 / 1024).toFixed(1)} MB` : ''

  async function handleZip() {
    // Requires `jszip` (npm i jszip) — wire in once you're ready for bulk export:
    //   const zip = new JSZip()
    //   for (const f of selected) zip.file(f.name, await (await fetch(f.url)).blob())
    //   const blob = await zip.generateAsync({ type: 'blob' })
    //   saveAs(blob, `FileVault_${new Date().toISOString().slice(0,10)}.zip`)
    showToast('Preparing ZIP… (wire up jszip in BulkBar.tsx)', 'info')
  }

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-card border border-primary/20 bg-primary/10 p-4">
      <span className="text-sm font-bold text-primary">
        {selected.length} selected{sizeStr}
      </span>
      <button
        onClick={handleZip}
        className="flex items-center gap-2 rounded-2xl px-5 py-2 text-xs font-bold text-white shadow-[0_6px_18px_rgba(59,130,246,0.3)]"
        style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}
      >
        <span className="material-symbols-outlined text-sm">download</span> ZIP
      </button>
      <button onClick={onClear} className="material-symbols-outlined cursor-pointer text-slate-400" aria-label="Clear selection">
        close
      </button>
    </div>
  )
}
