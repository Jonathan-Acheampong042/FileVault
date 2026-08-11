import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'
import { friendlyError } from '../../hooks/useAuthHelpers'
import CodeInput from './CodeInput'

interface Props {
  factorId: string
  challengeId: string
  onVerified: () => void
  onCancel: () => void
}

export default function MFAChallengeModal({ factorId, challengeId, onVerified, onCancel }: Props) {
  const showToast = useToast()
  const [tab, setTab] = useState<'totp' | 'recovery'>('totp')
  const [loading, setLoading] = useState(false)
  const [totpMsg, setTotpMsg] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [recoveryMsg, setRecoveryMsg] = useState('')

  async function handleVerifyTotp(code: string) {
    if (code.length !== 6) { setTotpMsg('Please enter all 6 digits.'); return }
    setLoading(true)
    const { data, error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code,
    })
    setLoading(false)
    if (error) { setTotpMsg(friendlyError(error)); return }
    onVerified()
  }

  async function handleVerifyRecovery() {
    const code = recoveryCode.trim().replace(/\s+/g, '')
    if (!code) { setRecoveryMsg('Please enter a recovery code.'); return }

    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); setRecoveryMsg('Session error — please cancel and sign in again.'); return }

    let result: { valid: boolean; error?: string; warning?: string; session?: { access_token: string; refresh_token: string } }
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/recovery-codes`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ action: 'verify', code, factorId, challengeId }),
        }
      )
      result = await res.json()
    } catch {
      result = { valid: false, error: 'Network error — please try again.' }
    }
    setLoading(false)

    if (!result.valid) {
      setRecoveryMsg(result.error || 'Invalid or already-used recovery code. Please try another.')
      setRecoveryCode('')
      return
    }
    if (result.warning) showToast('⚠️ ' + result.warning, 'info', 5000)
    if (result.session) {
      try {
        await supabase.auth.setSession({
          access_token: result.session.access_token,
          refresh_token: result.session.refresh_token,
        })
      } catch {}
    }
    onVerified()
  }

  function formatRecoveryCode(value: string) {
    const raw = value.replace(/-/g, '')
    return raw.match(/.{1,4}/g)?.join('-') ?? raw
  }

  async function handleCancel() {
    await supabase.auth.signOut()
    onCancel()
  }

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
      <div className="glass-card w-full max-w-[400px] animate-[fadeIn_0.3s_ease] rounded-3xl p-7">
        {/* Tab switcher */}
        <div className="mb-5 flex gap-1.5">
          <button
            onClick={() => setTab('totp')}
            className={`flex-1 rounded-[10px] border px-2 py-2.5 text-xs font-bold transition-all ${
              tab === 'totp'
                ? 'border-blue-500/35 bg-blue-500/[0.22] text-blue-300'
                : 'border-white/[0.07] bg-white/[0.04] text-slate-500 hover:bg-white/[0.08] hover:text-slate-400'
            }`}
          >
            Authenticator App
          </button>
          <button
            onClick={() => setTab('recovery')}
            className={`flex-1 rounded-[10px] border px-2 py-2.5 text-xs font-bold transition-all ${
              tab === 'recovery'
                ? 'border-blue-500/35 bg-blue-500/[0.22] text-blue-300'
                : 'border-white/[0.07] bg-white/[0.04] text-slate-500 hover:bg-white/[0.08] hover:text-slate-400'
            }`}
          >
            Recovery Code
          </button>
        </div>

        {/* TOTP panel */}
        {tab === 'totp' && (
          <div>
            <div className="mb-5 text-center">
              <div className="mx-auto mb-3 flex h-[52px] w-[52px] items-center justify-center rounded-2xl border border-blue-500/28 bg-blue-500/[0.12]">
                <span className="material-symbols-outlined text-[26px] text-blue-400">shield_lock</span>
              </div>
              <h3 className="mb-1 text-base font-bold text-white">Two-Factor Authentication</h3>
              <p className="text-[13px] text-slate-500">Enter the 6-digit code from your authenticator app</p>
            </div>
            <CodeInput onComplete={handleVerifyTotp} disabled={loading} />
            <button
              onClick={() => handleVerifyTotp('')}
              disabled={loading}
              className="mt-5 relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-[13px] border-none py-3.5 text-sm font-extrabold text-white transition-all disabled:opacity-55"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #7c3aed)' }}
            >
              {loading && <div className="h-[18px] w-[18px] shrink-0 animate-spin rounded-full border-[2.5px] border-white/30 border-t-white" />}
              {loading ? 'Verifying…' : 'Verify & Continue'}
            </button>
            {totpMsg && <p className="mt-3 text-center text-sm text-red-400">{totpMsg}</p>}
          </div>
        )}

        {/* Recovery panel */}
        {tab === 'recovery' && (
          <div>
            <div className="mb-5 text-center">
              <div className="mx-auto mb-3 flex h-[52px] w-[52px] items-center justify-center rounded-2xl border border-amber-500/28 bg-amber-500/[0.12]">
                <span className="material-symbols-outlined text-[26px] text-amber-400">key</span>
              </div>
              <h3 className="mb-1 text-base font-bold text-white">Use a Recovery Code</h3>
              <p className="text-[13px] leading-snug text-slate-500">Don't have your authenticator app? Enter one of the recovery codes you saved when you set up 2FA.</p>
            </div>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35 material-symbols-outlined text-lg">password</span>
              <input
                type="text"
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(formatRecoveryCode(e.target.value))}
                onKeyDown={(e) => e.key === 'Enter' && handleVerifyRecovery()}
                placeholder="xxxx-xxxx-xxxx-xxxx"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-[46px] pr-4 font-mono text-sm tracking-wider text-white placeholder-white/30 outline-none transition-colors focus:border-blue-500/55 focus:bg-white/[0.08]"
              />
            </div>
            <p className="mt-2 text-[11px] text-slate-600">Each recovery code can only be used once.</p>
            <button
              onClick={handleVerifyRecovery}
              disabled={loading}
              className="mt-4 relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-[13px] border-none py-3.5 text-sm font-extrabold text-white transition-all disabled:opacity-55"
              style={{ background: 'linear-gradient(135deg, #d97706, #b45309)' }}
            >
              {loading && <div className="h-[18px] w-[18px] shrink-0 animate-spin rounded-full border-[2.5px] border-white/30 border-t-white" />}
              {loading ? 'Verifying…' : 'Verify Recovery Code'}
            </button>
            {recoveryMsg && <p className="mt-3 text-center text-sm text-red-400">{recoveryMsg}</p>}
            <p className="mt-4 text-center text-[11px] leading-snug text-slate-600">
              Lost your recovery codes too? Once signed in another way, you can generate new ones from your profile's security settings.
            </p>
          </div>
        )}

        <button onClick={handleCancel} className="mt-3.5 w-full text-center text-xs text-slate-500 hover:text-slate-400">
          Cancel and sign out
        </button>
      </div>
    </div>
  )
}
