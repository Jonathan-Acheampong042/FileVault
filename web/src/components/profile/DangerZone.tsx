import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function DangerZone() {
  const showToast = useToast()
  const { user } = useAuth()
  const navigate = useNavigate()
  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  async function clearDownloadHistory() {
    if (!confirm('Clear your download history?')) return
    if (user) {
      await supabase.from('user_downloads').delete().eq('user_id', user.id)
    }
    localStorage.removeItem('fvDownloadHistory')
    localStorage.removeItem('fvDLHistory')
    
    // We should probably dispatch an event or use context to refresh the history
    window.dispatchEvent(new Event('refresh_downloads'))
    showToast('Download history cleared', 'info')
  }

  function clearPinnedFiles() {
    if (!confirm('Unpin all files on this device?')) return
    localStorage.removeItem('fvBookmarks')
    window.dispatchEvent(new Event('refresh_pins'))
    showToast('Pinned files cleared', 'info')
  }

  function resetAllPrefs() {
    if (!confirm('Reset all FileVault preferences on this device? This clears notification settings, display settings, collections, and cached data. Your account and files are not affected.')) return
    
    const keep = ['fvDownloadHistory', 'fvDLHistory', 'fvBookmarks', 'fv_remember_me', 'sb-lvhecpvwpzmstciewziv-auth-token']
    const toRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith('fv') && !keep.includes(k)) toRemove.push(k)
    }
    toRemove.forEach(k => localStorage.removeItem(k))
    
    showToast('All preferences reset to defaults. Reloading...', 'info')
    setTimeout(() => window.location.reload(), 1000)
  }

  async function confirmDeleteAccount() {
    if (deleteConfirm.trim().toUpperCase() !== 'DELETE') return
    setDeleteLoading(true)
    setDeleteError('')
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Your session has expired. Please sign in again.')

      const PUSH_API = window.location.hostname === 'localhost' 
        ? 'http://localhost:3000' 
        : 'https://project-one-187u.onrender.com'
        
      const res = await fetch(`${PUSH_API}/api/delete-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Server returned ${res.status}`)
      }

      showToast('Your account has been deleted', 'info')
      localStorage.clear()
      await supabase.auth.signOut()
      navigate('/login')
    } catch (err: any) {
      setDeleteError(err.message)
      setDeleteLoading(false)
    }
  }

  return (
    <>
      <div className="section-card border border-red-500/15 bg-white/[0.03] p-5 rounded-[1.1rem]">
        <div className="mb-4 flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-wider text-red-300">
          <span className="material-symbols-outlined text-[18px] text-red-400">warning</span>
          Data & Privacy
        </div>
        
        <div className="space-y-1">
          <DangerItem 
            label="Clear download history"
            sub="Removes the list of files you've downloaded on this device"
            actionText="Clear"
            onClick={clearDownloadHistory}
          />
          <DangerItem 
            label="Clear pinned files"
            sub="Unpins all files on this device (pins are stored locally)"
            actionText="Clear"
            onClick={clearPinnedFiles}
          />
          <DangerItem 
            label="Reset all preferences"
            sub="Clears notification settings, view preferences, and cached data"
            actionText="Reset"
            onClick={resetAllPrefs}
          />
          <DangerItem 
            label="Delete account"
            sub="Permanently deletes your account, files history, and personal data. Cannot be undone."
            actionText="Delete"
            onClick={() => setDeleteModalOpen(true)}
            isRed
          />
        </div>
      </div>

      {/* Delete Account Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-[380px] flex-col rounded-3xl border border-white/10 bg-slate-950/98 p-6 shadow-2xl">
            <div className="mb-4 text-center">
              <div className="mx-auto mb-3 flex h-[52px] w-[52px] items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 text-red-400">
                <span className="material-symbols-outlined text-[26px]">no_accounts</span>
              </div>
              <h3 className="mb-1 text-base font-bold text-white">Delete Your Account</h3>
              <p className="text-[13px] text-slate-400">This permanently deletes your account, profile, request history, and saved preferences. This action cannot be undone.</p>
            </div>
            
            <p className="mb-2 text-center text-[11px] text-slate-500">Type <strong className="text-red-300">DELETE</strong> to confirm</p>
            <input
              type="text"
              placeholder="DELETE"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-center text-sm font-bold tracking-widest text-white outline-none focus:border-red-500/50"
            />
            
            <button
              onClick={confirmDeleteAccount}
              disabled={deleteConfirm.trim().toUpperCase() !== 'DELETE' || deleteLoading}
              className="mt-3 flex w-full items-center justify-center rounded-[13px] bg-red-500/10 border border-red-500/30 py-3.5 text-[13px] font-extrabold text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50 disabled:hover:bg-red-500/10"
            >
              {deleteLoading ? 'Deleting...' : 'Permanently Delete My Account'}
            </button>
            
            {deleteError && <p className="mt-3 text-center text-sm text-red-400">{deleteError}</p>}
            
            <button
              onClick={() => setDeleteModalOpen(false)}
              className="mt-2.5 w-full text-center text-xs text-slate-500 hover:text-slate-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function DangerItem({ label, sub, actionText, onClick, isRed = false }: { label: string, sub: string, actionText: string, onClick: () => void, isRed?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/[0.05] py-3 last:border-b-0">
      <div>
        <p className={`text-[13px] font-bold ${isRed ? 'text-red-400' : 'text-slate-200'}`}>{label}</p>
        <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p>
      </div>
      <button
        onClick={onClick}
        className={`shrink-0 rounded-[10px] border px-3 py-1.5 text-[11px] font-bold transition-colors ${
          isRed 
            ? 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20' 
            : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
        }`}
      >
        {actionText}
      </button>
    </div>
  )
}
