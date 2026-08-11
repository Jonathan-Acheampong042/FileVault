import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'

interface RequestFormProps {
  email: string
  onSubmitSuccess: (id: string) => void
  initialData?: {
    filename?: string
    folder?: string
  }
}

export default function RequestForm({ email, onSubmitSuccess, initialData }: RequestFormProps) {
  const showToast = useToast()
  const [loading, setLoading] = useState(false)
  
  // Form fields
  const [filename, setFilename] = useState(initialData?.filename || '')
  const [description, setDescription] = useState('')
  const [reason, setReason] = useState('')
  const [folder, setFolder] = useState(initialData?.folder || '')
  const [contactEmail, setContactEmail] = useState(email)
  const [pushOptIn, setPushOptIn] = useState(false)
  const [honeypot, setHoneypot] = useState('')
  
  // Folder suggestions
  const [folders, setFolders] = useState<string[]>([])

  useEffect(() => {
    loadFolders()
  }, [])

  async function loadFolders() {
    try {
      const { data, error } = await supabase
        .from('files_list')
        .select('folder_name')
        .not('folder_name', 'is', null)
        .order('folder_name')
        .limit(500)
        
      if (!error && data && data.length) {
        const seen = new Set<string>()
        data.forEach((row: any) => {
          const name = (row.folder_name || '').trim()
          if (name && !seen.has(name)) seen.add(name)
        })
        setFolders(Array.from(seen))
      }
    } catch (e) {
      console.error(e)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!filename.trim()) {
      showToast('Please enter the file name.', 'error')
      return
    }
    if (!reason.trim()) {
      showToast('Please provide a reason.', 'error')
      return
    }
    
    // Honeypot check
    if (honeypot) {
      onSubmitSuccess('bot-blocked-' + Date.now())
      return
    }

    // Local throttle check (1 hour)
    const LOCAL_THROTTLE_KEY = 'fv_last_submit_ts'
    const lastTs = parseInt(localStorage.getItem(LOCAL_THROTTLE_KEY) || '0', 10)
    if (lastTs && (Date.now() - lastTs) < 60 * 60 * 1000) {
      showToast('You\'ve already submitted a request in the last hour. Please wait before submitting another.', 'error')
      return
    }

    setLoading(true)
    
    try {
      // Server throttle check
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const { count } = await supabase
        .from('upload_requests')
        .select('id', { count: 'exact', head: true })
        .eq('requester_email', contactEmail)
        .gte('created_at', oneHourAgo)
        
      if (count && count > 0) {
        showToast('You\'ve already submitted a request in the last hour.', 'error')
        setLoading(false)
        return
      }

      // Note: Push API logic from vanilla JS app has been deferred to Phase 6 (Full Service Worker).
      // We will only save the request itself for now.
      
      const { data: inserted, error } = await supabase.from('upload_requests').insert({
        filename: filename.trim(),
        description: description.trim() || null,
        reason: reason.trim(),
        folder: folder.trim() || null,
        status: 'pending',
        requester_email: contactEmail,
      }).select('id').single()
      
      if (error) throw error

      localStorage.setItem(LOCAL_THROTTLE_KEY, String(Date.now()))
      
      if (inserted?.id) {
        onSubmitSuccess(inserted.id)
      }
      
    } catch (err: any) {
      console.error(err)
      showToast('Submission failed: ' + (err.message || 'Unknown error'), 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="animate-[fadeIn_0.3s_ease]">
      
      {initialData?.filename && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-blue-500/25 bg-blue-500/10 px-3.5 py-2.5 text-xs text-blue-300">
          <span className="material-symbols-outlined shrink-0 text-[15px]">auto_fix_high</span>
          Form pre-filled from your Vault — just add a reason and submit!
        </div>
      )}

      {/* File Name */}
      <div className="mb-4">
        <label className="mb-[7px] block text-[11px] font-bold uppercase tracking-widest text-slate-400">
          File / Material Name <span className="text-red-500">*</span>
        </label>
        <input 
          type="text" 
          required 
          maxLength={160}
          placeholder="e.g. UGBS 301 Lecture 5 Slides"
          value={filename}
          onChange={e => setFilename(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white transition-colors focus:border-blue-500/50 focus:bg-white/10 focus:outline-none"
        />
        <div className="mt-1 flex justify-end text-[10px] text-slate-500">
          <span>{filename.length} / 160</span>
        </div>
      </div>

      {/* Description */}
      <div className="mb-4">
        <label className="mb-[7px] block text-[11px] font-bold uppercase tracking-widest text-slate-400">
          Description <span className="normal-case tracking-normal font-normal text-slate-500">(optional)</span>
        </label>
        <textarea 
          rows={3} 
          maxLength={400}
          placeholder="Add any detail — topic, chapter, date, lecturer name…"
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="w-full resize-y rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white transition-colors focus:border-blue-500/50 focus:bg-white/10 focus:outline-none"
        />
        <div className="mt-1 flex justify-end text-[10px] text-slate-500">
          <span>{description.length} / 400</span>
        </div>
      </div>

      {/* Reason */}
      <div className="mb-4">
        <label className="mb-[7px] block text-[11px] font-bold uppercase tracking-widest text-slate-400">
          Why do you need it? <span className="text-red-500">*</span>
        </label>
        <textarea 
          required
          rows={2} 
          maxLength={300}
          placeholder="e.g. Missed class due to illness. Preparing for exams."
          value={reason}
          onChange={e => setReason(e.target.value)}
          className="w-full resize-y rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white transition-colors focus:border-blue-500/50 focus:bg-white/10 focus:outline-none"
        />
        <div className="mt-1 flex justify-end text-[10px] text-slate-500">
          <span>{reason.length} / 300</span>
        </div>
      </div>

      {/* Folder */}
      <div className="mb-4">
        <label className="mb-[7px] block text-[11px] font-bold uppercase tracking-widest text-slate-400">
          Course / Folder <span className="normal-case tracking-normal font-normal text-slate-500">(optional)</span>
        </label>
        <input 
          type="text" 
          maxLength={80}
          list="folderSuggestions"
          placeholder="e.g. UGBS 301 or Business Analytics"
          value={folder}
          onChange={e => setFolder(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white transition-colors focus:border-blue-500/50 focus:bg-white/10 focus:outline-none"
        />
        <datalist id="folderSuggestions">
          {folders.map(f => (
            <option key={f} value={f} />
          ))}
        </datalist>
        <div className="mt-1 flex items-center justify-between">
          <p className="text-[11px] text-slate-500">
            {folders.length > 0 ? 'Start typing to see existing folders, or leave blank if unsure.' : 'Leave blank if you\'re unsure.'}
          </p>
          <span className="text-[10px] text-slate-500">{folder.length} / 80</span>
        </div>
      </div>

      {/* Email */}
      <div className="mb-4">
        <label className="mb-[7px] block text-[11px] font-bold uppercase tracking-widest text-slate-400">
          Your Email <span className="normal-case tracking-normal font-normal text-slate-500">(optional)</span>
        </label>
        <input 
          type="email" 
          placeholder="e.g. johndoe@university.edu"
          value={contactEmail}
          onChange={e => setContactEmail(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white transition-colors focus:border-blue-500/50 focus:bg-white/10 focus:outline-none"
        />
        <p className="mt-1 text-[11px] text-slate-500">If provided, the manager can notify you directly when your file is ready.</p>
      </div>

      {/* Push Opt-in */}
      <div className="mb-5 flex items-start gap-2.5">
        <input 
          type="checkbox" 
          id="req_push_optin"
          checked={pushOptIn}
          onChange={e => setPushOptIn(e.target.checked)}
          className="mt-[3px] h-4 w-4 shrink-0 rounded border-white/20 bg-white/10 text-blue-500 focus:ring-0 focus:ring-offset-0"
        />
        <label htmlFor="req_push_optin" className="text-xs font-medium text-slate-400 cursor-pointer select-none">
          Notify me on this device when my request is approved
        </label>
      </div>

      {/* Honeypot */}
      <div className="absolute -left-[9999px] -top-[9999px] h-px w-px overflow-hidden opacity-0" aria-hidden="true">
        <label htmlFor="hp_website">Website (leave blank)</label>
        <input 
          type="text" 
          id="hp_website" 
          value={honeypot}
          onChange={e => setHoneypot(e.target.value)}
          tabIndex={-1} 
          autoComplete="off" 
        />
      </div>

      {/* Submit */}
      <button 
        type="submit" 
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-gradient-to-br from-blue-500 to-violet-500 p-3.5 text-[15px] font-extrabold text-white transition-all hover:-translate-y-[1px] hover:opacity-90 disabled:opacity-50 disabled:hover:translate-y-0"
      >
        <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>
          {loading ? 'refresh' : 'send'}
        </span>
        {loading ? 'Submitting…' : 'Submit Request'}
      </button>
    </form>
  )
}
