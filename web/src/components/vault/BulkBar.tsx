import { useState } from 'react'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import type { VaultFile } from '../../types'
import { useToast } from '../../context/ToastContext'

interface BulkBarProps {
  selected: VaultFile[]
  onClear: () => void
}

export default function BulkBar({ selected, onClear }: BulkBarProps) {
  const showToast = useToast()
  const [zipping, setZipping] = useState(false)
  if (!selected.length) return null

  const totalBytes = selected.reduce((sum, f) => sum + (f.fileSize || 0), 0)
  const sizeStr = totalBytes > 0 ? ` · ${(totalBytes / 1024 / 1024).toFixed(1)} MB` : ''

  async function handleZip() {
    if (zipping) return
    setZipping(true)
    showToast(`Preparing ZIP of ${selected.length} file(s)…`, 'info', 3000)
    try {
      const zip = new JSZip()
      for (const f of selected) {
        const response = await fetch(f.url)
        if (!response.ok) throw new Error(`Failed to fetch ${f.name}`)
        const blob = await response.blob()
        zip.file(f.name, blob)
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      saveAs(zipBlob, `FileVault_${new Date().toISOString().slice(0, 10)}.zip`)
      showToast(`✅ ZIP downloaded — ${selected.length} file(s)`, 'success', 3000)
    } catch (err) {
      console.error('[BulkBar] ZIP error:', err)
      showToast('Failed to create ZIP. Please try again.', 'error', 4000)
    } finally {
      setZipping(false)
    }
  }

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-card border border-primary/20 bg-primary/10 p-4">
      <span className="text-sm font-bold text-primary">
        {selected.length} selected{sizeStr}
      </span>
      <button
        onClick={handleZip}
        disabled={zipping}
        className="flex items-center gap-2 rounded-2xl px-5 py-2 text-xs font-bold text-white shadow-[0_6px_18px_rgba(59,130,246,0.3)] disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}
      >
        <span className="material-symbols-outlined text-sm">{zipping ? 'hourglass_top' : 'download'}</span>
        {zipping ? 'Zipping…' : 'ZIP'}
      </button>
      <button onClick={onClear} className="material-symbols-outlined cursor-pointer text-slate-400" aria-label="Clear selection">
        close
      </button>
    </div>
  )
}
