import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'
import { friendlyError } from '../../hooks/useAuthHelpers'
import CodeInput from '../auth/CodeInput'

export default function TwoFactorSetup() {
  const showToast = useToast()
  
  const [loading, setLoading] = useState(true)
  const [isEnabled, setIsEnabled] = useState(false)
  
  // Modals
  const [enrollModalOpen, setEnrollModalOpen] = useState(false)
  const [recoveryModalOpen, setRecoveryModalOpen] = useState(false)
  const [regenModalOpen, setRegenModalOpen] = useState(false)
  
  // Enroll state
  const [enrollStep, setEnrollStep] = useState<1 | 2>(1)
  const [qrCode, setQrCode] = useState<string>('')
  const [secret, setSecret] = useState<string>('')
  const [factorId, setFactorId] = useState<string>('')
  const [enrollLoading, setEnrollLoading] = useState(false)
  const [enrollError, setEnrollError] = useState('')
  
  // Recovery codes
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [regenConfirm, setRegenConfirm] = useState('')
  const [regenLoading, setRegenLoading] = useState(false)
  const [regenError, setRegenError] = useState('')

  useEffect(() => {
    loadMfaStatus()
  }, [])

  async function loadMfaStatus() {
    setLoading(true)
    const { data: factors, error } = await supabase.auth.mfa.listFactors()
    if (!error && factors) {
      const totp = factors.totp.find((f) => f.status === 'verified')
      setIsEnabled(!!totp)
      if (totp) setFactorId(totp.id)
    }
    setLoading(false)
  }

  // --- Enrollment ---

  async function startEnrollment() {
    setEnrollModalOpen(true)
    setEnrollStep(1)
    setEnrollLoading(true)
    setEnrollError('')
    
    // First remove any unverified factors (leftovers from interrupted enrollments)
    const { data: factors } = await supabase.auth.mfa.listFactors()
    if (factors) {
      const unverified = factors.totp.filter(f => (f.status as string) !== 'verified')
      for (const f of unverified) {
        await supabase.auth.mfa.unenroll({ factorId: f.id })
      }
    }
    
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
    })
    
    if (error) {
      setEnrollError(friendlyError(error))
      setEnrollLoading(false)
      return
    }
    
    if (data) {
      setFactorId(data.id)
      setQrCode('data:image/svg+xml;utf-8,' + encodeURIComponent(data.totp.qr_code))
      setSecret(data.totp.secret)
      setEnrollStep(2)
    }
    setEnrollLoading(false)
  }

  async function verifyEnrollment(code: string) {
    if (code.length !== 6) return
    setEnrollLoading(true)
    setEnrollError('')
    
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
    if (challengeError) {
      setEnrollError(friendlyError(challengeError))
      setEnrollLoading(false)
      return
    }
    
    const { data, error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code
    })
    
    setEnrollLoading(false)
    if (error) {
      setEnrollError(friendlyError(error))
      return
    }
    
    // Success!
    setEnrollModalOpen(false)
    showToast('Two-factor authentication enabled', 'success')
    loadMfaStatus()
    
    // Prompt to save recovery codes
    regenerateCodes(true)
  }

  function copySecret() {
    navigator.clipboard.writeText(secret)
    showToast('Secret copied to clipboard', 'info')
  }

  // --- Disablement ---

  async function disableMfa() {
    if (!confirm('Are you sure you want to disable two-factor authentication? This makes your account less secure.')) return
    
    // Check if we need a fresh challenge to unenroll
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (aal && aal.currentLevel !== 'aal2') {
      alert('For security reasons, you must sign in with 2FA again to disable it. Please sign out and sign back in.')
      return
    }
    
    setLoading(true)
    const { error } = await supabase.auth.mfa.unenroll({ factorId })
    if (error) {
      showToast(friendlyError(error), 'error')
      setLoading(false)
      return
    }
    
    showToast('Two-factor authentication disabled', 'info')
    loadMfaStatus()
  }

  // --- Recovery Codes ---

  async function regenerateCodes(isFirstTime = false) {
    if (!isFirstTime) {
      if (regenConfirm.trim().toUpperCase() !== 'REGENERATE') return
      setRegenLoading(true)
      setRegenError('')
    }
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      if (!isFirstTime) {
        setRegenError('Session expired. Please sign in again.')
        setRegenLoading(false)
      }
      return
    }
    
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/recovery-codes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ action: 'generate' })
      })
      
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Server error')
      
      setRecoveryCodes(result.codes || [])
      setRegenModalOpen(false)
      setRegenConfirm('')
      setRecoveryModalOpen(true)
    } catch (err: any) {
      if (!isFirstTime) {
        setRegenError(err.message)
      } else {
        showToast('Could not generate recovery codes. Please generate them from settings.', 'error')
      }
    } finally {
      if (!isFirstTime) setRegenLoading(false)
    }
  }

  function copyRecoveryCodes() {
    navigator.clipboard.writeText(recoveryCodes.join('\n'))
    showToast('Codes copied to clipboard', 'info')
  }

  return (
    <>
      <div className="section-card border border-white/5 bg-white/[0.03] p-5 rounded-[1.1rem]">
        <div className="mb-3.5 flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-wider text-slate-100">
          <span className="material-symbols-outlined text-[18px] text-blue-400">verified_user</span>
          Two-Factor Authentication
        </div>
        <p className="mb-3 text-[12px] leading-relaxed text-slate-500">
          Protect your account with an authenticator app. Once enabled, you'll need a 6-digit code from the app every time you sign in.
        </p>

        {loading ? (
          <div className="flex h-[42px] items-center text-[13px] text-slate-500">Loading...</div>
        ) : isEnabled ? (
          <>
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-emerald-400">
              <span className="material-symbols-outlined text-[18px]">gpp_good</span>
              <span className="text-[13px] font-bold">Two-factor authentication is on</span>
            </div>
            <button
              onClick={disableMfa}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-[13px] font-bold text-slate-300 transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
            >
              Disable Two-Factor Authentication
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 rounded-xl border border-slate-500/20 bg-slate-500/10 px-4 py-2.5 text-slate-400">
              <span className="material-symbols-outlined text-[18px]">gpp_maybe</span>
              <span className="text-[13px] font-bold">Two-factor authentication is off</span>
            </div>
            <button
              onClick={startEnrollment}
              className="btn-primary mt-3 w-full rounded-[13px] border-none bg-gradient-to-br from-blue-500 to-violet-500 py-3 text-[13px] font-extrabold text-white transition-opacity hover:opacity-90"
            >
              Enable Two-Factor Authentication
            </button>
          </>
        )}
      </div>

      {isEnabled && (
        <div className="mt-5 section-card border border-white/5 bg-white/[0.03] p-5 rounded-[1.1rem]">
          <div className="mb-3.5 flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-wider text-slate-100">
            <span className="material-symbols-outlined text-[18px] text-blue-400">key</span>
            Recovery Codes
          </div>
          <p className="mb-3 text-[12px] leading-relaxed text-slate-500">
            If you lose access to your authenticator app, a recovery code is the only other way into your account. Each code works once. Generating new codes invalidates all previous ones.
          </p>
          <button
            onClick={() => setRegenModalOpen(true)}
            className="w-full rounded-[13px] border-none bg-gradient-to-br from-amber-600 to-amber-700 py-3 text-[13px] font-extrabold text-white transition-opacity hover:opacity-90"
          >
            Regenerate Recovery Codes
          </button>
        </div>
      )}

      {/* Enroll Modal */}
      {enrollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-[380px] flex-col rounded-3xl border border-white/10 bg-slate-950/98 p-6 shadow-2xl">
            <div className="mb-4 text-center">
              <div className="mx-auto mb-3 flex h-[52px] w-[52px] items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-500/10 text-blue-400">
                <span className="material-symbols-outlined text-[26px]">qr_code_2</span>
              </div>
              <h3 className="mb-1 text-base font-bold text-white">Set Up Two-Factor Authentication</h3>
              <p className="text-[13px] text-slate-400">Scan this QR code with your authenticator app, then enter the 6-digit code it generates.</p>
            </div>
            
            {enrollStep === 1 && enrollLoading && (
              <div className="py-8 text-center text-[13px] text-slate-500">Setting up...</div>
            )}
            
            {enrollStep === 2 && (
              <div className="animate-[fadeIn_0.3s_ease]">
                <div className="mb-4 text-center">
                  <img src={qrCode} alt="2FA QR Code" className="mx-auto h-[180px] w-[180px] rounded-xl bg-white p-2" />
                </div>
                <p className="mb-1.5 text-center text-[11px] text-slate-500">Can't scan? Enter this code manually:</p>
                <div className="mb-4 flex items-center justify-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] py-2 pl-4 pr-2">
                  <span className="font-mono text-[13px] tracking-wider text-slate-300">{secret}</span>
                  <button onClick={copySecret} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white">
                    <span className="material-symbols-outlined text-[16px]">content_copy</span>
                  </button>
                </div>
                
                <CodeInput onComplete={verifyEnrollment} disabled={enrollLoading} />
                
                {enrollError && <p className="mt-3 text-center text-sm text-red-400">{enrollError}</p>}
                
                <button
                  onClick={() => verifyEnrollment('')}
                  disabled={enrollLoading}
                  className="mt-4 flex w-full items-center justify-center rounded-[13px] bg-gradient-to-br from-blue-500 to-violet-500 py-3.5 text-[13px] font-extrabold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {enrollLoading ? 'Verifying...' : 'Verify & Enable'}
                </button>
              </div>
            )}
            
            <button
              onClick={() => {
                setEnrollModalOpen(false)
                if (enrollStep === 2) supabase.auth.mfa.unenroll({ factorId })
              }}
              className="mt-2.5 w-full text-center text-xs text-slate-500 hover:text-slate-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Recovery Codes Display Modal */}
      {recoveryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-[380px] flex-col rounded-3xl border border-white/10 bg-slate-950/98 p-6 shadow-2xl">
            <div className="mb-4 text-center">
              <div className="mx-auto mb-3 flex h-[52px] w-[52px] items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
                <span className="material-symbols-outlined text-[26px]">key</span>
              </div>
              <h3 className="mb-1 text-base font-bold text-white">Your Recovery Codes</h3>
              <p className="text-[13px] text-slate-400">Save these somewhere safe. Each code works once to sign in if you lose access to your authenticator app. <strong className="text-amber-400">They won't be shown again.</strong></p>
            </div>
            
            <div className="mb-4 grid grid-cols-2 gap-1.5">
              {recoveryCodes.map(c => (
                <div key={c} className="rounded-lg border border-white/5 bg-white/[0.03] py-2 text-center font-mono text-[13px] tracking-widest text-slate-300">
                  {c}
                </div>
              ))}
            </div>
            
            <button
              onClick={copyRecoveryCodes}
              className="flex w-full items-center justify-center gap-2 rounded-[13px] bg-gradient-to-br from-blue-500 to-violet-500 py-3.5 text-[13px] font-extrabold text-white transition-opacity hover:opacity-90"
            >
              <span className="material-symbols-outlined text-[16px]">content_copy</span>
              Copy All Codes
            </button>
            
            <button
              onClick={() => setRecoveryModalOpen(false)}
              className="mt-2.5 w-full text-center text-xs text-slate-500 hover:text-slate-400"
            >
              I've saved these — Close
            </button>
          </div>
        </div>
      )}

      {/* Regenerate Confirm Modal */}
      {regenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-[380px] flex-col rounded-3xl border border-white/10 bg-slate-950/98 p-6 shadow-2xl">
            <div className="mb-4 text-center">
              <div className="mx-auto mb-3 flex h-[52px] w-[52px] items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
                <span className="material-symbols-outlined text-[26px]">warning</span>
              </div>
              <h3 className="mb-1 text-base font-bold text-white">Regenerate Recovery Codes</h3>
              <p className="text-[13px] text-slate-400">This immediately invalidates all of your existing recovery codes, including any you haven't used yet. A new set of 8 codes will replace them.</p>
            </div>
            
            <p className="mb-2 text-center text-[11px] text-slate-500">Type <strong className="text-amber-400">REGENERATE</strong> to confirm</p>
            <input
              type="text"
              placeholder="REGENERATE"
              value={regenConfirm}
              onChange={(e) => setRegenConfirm(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-center text-sm font-bold tracking-widest text-white outline-none focus:border-amber-500/50"
            />
            
            <button
              onClick={() => regenerateCodes()}
              disabled={regenConfirm.trim().toUpperCase() !== 'REGENERATE' || regenLoading}
              className="mt-3 flex w-full items-center justify-center rounded-[13px] bg-gradient-to-br from-amber-600 to-amber-700 py-3.5 text-[13px] font-extrabold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {regenLoading ? 'Regenerating...' : 'Regenerate Codes'}
            </button>
            
            {regenError && <p className="mt-3 text-center text-sm text-red-400">{regenError}</p>}
            
            <button
              onClick={() => setRegenModalOpen(false)}
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
