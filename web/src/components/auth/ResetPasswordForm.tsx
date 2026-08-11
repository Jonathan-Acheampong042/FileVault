import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { friendlyError, checkPwdStrength } from '../../hooks/useAuthHelpers'
import PasswordStrengthMeter from './PasswordStrengthMeter'

interface Props {
  onComplete: () => void
  onCancel: () => void
}

export default function ResetPasswordForm({ onComplete, onCancel }: Props) {
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showNewPwd, setShowNewPwd] = useState(false)
  const [showConfirmPwd, setShowConfirmPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ text: string; type: 'error' | 'success' } | null>(null)

  const matchMsg = confirmPwd
    ? newPwd === confirmPwd
      ? { text: '✓ Passwords match', color: 'text-emerald-400' }
      : { text: '✗ Passwords do not match', color: 'text-red-400' }
    : null

  async function handleSetPassword() {
    setMsg(null)
    if (!newPwd) { setMsg({ text: 'Please enter a new password.', type: 'error' }); return }
    const pwdCheck = checkPwdStrength(newPwd)
    if (pwdCheck.score < 4) {
      setMsg({ text: 'Your password does not meet all the requirements. Please strengthen it.', type: 'error' })
      return
    }
    if (newPwd !== confirmPwd) {
      setMsg({ text: 'Passwords do not match. Please re-enter them.', type: 'error' })
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPwd })
    setLoading(false)

    if (error) {
      const errMsg = error.message?.toLowerCase() || ''
      if (errMsg.includes('different') || errMsg.includes('same')) {
        setMsg({ text: 'Your new password must be different from your previous password. Please choose a different one.', type: 'error' })
      } else {
        setMsg({ text: friendlyError(error), type: 'error' })
      }
      return
    }

    setMsg({ text: '✅ Password updated! Redirecting to your vault…', type: 'success' })
    history.replaceState(null, '', window.location.pathname)
    sessionStorage.removeItem('fvFilesCache')
    setTimeout(() => onComplete(), 1500)
  }

  async function handleCancel() {
    setLoading(true)
    await supabase.auth.signOut()
    setLoading(false)
    history.replaceState(null, '', window.location.pathname)
    onCancel()
  }

  return (
    <div>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3.5 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.12]">
          <span className="material-symbols-outlined text-[28px] text-emerald-400">lock_reset</span>
        </div>
        <h3 className="mb-1.5 text-lg font-bold text-white">Set a New Password</h3>
        <p className="text-[13px] leading-snug text-slate-500">
          Your identity has been verified.<br />Choose a strong new password below — you'll be signed in automatically once it's set.
        </p>
      </div>

      <div className="space-y-3">
        {/* New password */}
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35 material-symbols-outlined text-lg">lock</span>
          <input
            type={showNewPwd ? 'text' : 'password'}
            value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)}
            placeholder="New password"
            autoComplete="new-password"
            className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-[46px] pr-12 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-blue-500/55 focus:bg-white/[0.08]"
          />
          <button type="button" onClick={() => setShowNewPwd(!showNewPwd)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/60">
            <span className="material-symbols-outlined text-lg">{showNewPwd ? 'visibility_off' : 'visibility'}</span>
          </button>
        </div>

        <PasswordStrengthMeter password={newPwd} visible={newPwd.length > 0} />

        {/* Confirm password */}
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35 material-symbols-outlined text-lg">lock_open</span>
          <input
            type={showConfirmPwd ? 'text' : 'password'}
            value={confirmPwd}
            onChange={(e) => setConfirmPwd(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSetPassword()}
            placeholder="Confirm new password"
            autoComplete="new-password"
            className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-[46px] pr-12 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-blue-500/55 focus:bg-white/[0.08]"
          />
          <button type="button" onClick={() => setShowConfirmPwd(!showConfirmPwd)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/60">
            <span className="material-symbols-outlined text-lg">{showConfirmPwd ? 'visibility_off' : 'visibility'}</span>
          </button>
        </div>

        {matchMsg && <p className={`-mt-1 text-[11px] ${matchMsg.color}`}>{matchMsg.text}</p>}

        <button
          onClick={handleSetPassword}
          disabled={loading}
          className="relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-[13px] border-none py-3.5 text-sm font-extrabold text-white transition-all disabled:opacity-55 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
        >
          {loading && <div className="h-[18px] w-[18px] shrink-0 animate-spin rounded-full border-[2.5px] border-white/30 border-t-white" />}
          {loading ? 'Updating…' : 'Update Password'}
        </button>

        <button onClick={handleCancel} className="w-full text-center text-xs text-slate-500 hover:text-slate-400">
          Cancel and return to sign in
        </button>
      </div>

      {msg && (
        <p className={`mt-3 text-center text-sm ${msg.type === 'error' ? 'text-red-400' : 'text-emerald-400'}`} role="alert">
          {msg.text}
        </p>
      )}
    </div>
  )
}
