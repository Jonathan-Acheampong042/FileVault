import { useState, useRef } from 'react'
import HCaptcha from '@hcaptcha/react-hcaptcha'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'
import { friendlyError, isValidEmail } from '../../hooks/useAuthHelpers'

const HCAPTCHA_SITEKEY = 'f7dcb47a-d48c-48fe-b802-401c1bc48492'

interface Props {
  onSignedIn: () => void
  onForgotPassword: () => void
  onSwitchToMagicLink: () => void
  onSwitchToOTP: () => void
  onMfaRequired: (factorId: string, challengeId: string) => void
}

export default function SignInForm({
  onSignedIn,
  onForgotPassword,
  onSwitchToMagicLink,
  onSwitchToOTP,
  onMfaRequired,
}: Props) {
  const showToast = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [remember, setRemember] = useState(localStorage.getItem('fv_remember_me') === '1')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [emailError, setEmailError] = useState(false)
  const [pwdError, setPwdError] = useState(false)
  const captchaRef = useRef<HCaptcha>(null)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)

  async function handleSignIn() {
    setError(null)
    setSuccess(null)

    if (!email.trim()) {
      setError('Please enter your email address.')
      setEmailError(true)
      return
    }
    if (!isValidEmail(email.trim())) {
      setError('Please enter a valid email address (e.g. name@university.edu).')
      setEmailError(true)
      return
    }
    if (!password) {
      setError('Please enter your password.')
      setPwdError(true)
      return
    }
    if (!captchaToken) {
      setError('Please complete the CAPTCHA.')
      return
    }

    if (remember) localStorage.setItem('fv_remember_me', '1')
    else localStorage.removeItem('fv_remember_me')

    setLoading(true)
    const { data, error: authErr } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
      options: { captchaToken },
    })
    setLoading(false)
    setCaptchaToken(null)
    captchaRef.current?.resetCaptcha()

    if (authErr) {
      const msg = authErr.message?.toLowerCase() || ''
      if (msg.includes('email not confirmed')) {
        setError("⚠️ Email not verified yet. Check your inbox for the confirmation link.")
      } else if (msg.includes('invalid login') || msg.includes('invalid credentials')) {
        setError('Incorrect email or password. Please check your details and try again.')
        setPwdError(true)
        setPassword('')
      } else {
        setError(friendlyError(authErr))
      }
      return
    }

    // Check if MFA is needed
    const { data: factors } = await supabase.auth.mfa.listFactors()
    const totp = (factors?.totp || []).find((f) => f.status === 'verified')
    if (totp) {
      const { data: aal } = await supabase.auth.mfa
        .getAuthenticatorAssuranceLevel()
        .catch(() => ({ data: null }))
      if (aal && aal.currentLevel !== 'aal2') {
        const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({
          factorId: totp.id,
        })
        if (!chErr && challenge) {
          onMfaRequired(totp.id, challenge.id)
          return
        }
      }
    }

    showToast('✓ Signed in! Welcome back.', 'success', 3000)
    onSignedIn()
  }

  async function resendConfirmation() {
    const { error: resendErr } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
    })
    if (resendErr) {
      setError(friendlyError(resendErr))
    } else {
      setSuccess('✉️ Confirmation email resent! Check your inbox and spam folder.')
      setError(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Email */}
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35 material-symbols-outlined text-lg">
          mail
        </span>
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setEmailError(false); setError(null) }}
          placeholder="Your email address"
          autoComplete="email"
          className={`w-full rounded-xl border bg-white/5 py-3 pl-[46px] pr-4 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-blue-500/55 focus:bg-white/[0.08] ${
            emailError ? 'border-red-500!' : 'border-white/10'
          }`}
        />
      </div>

      {/* Password */}
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35 material-symbols-outlined text-lg">
          lock
        </span>
        <input
          type={showPwd ? 'text' : 'password'}
          value={password}
          onChange={(e) => { setPassword(e.target.value); setPwdError(false); setError(null) }}
          onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
          placeholder="Your password"
          autoComplete="current-password"
          className={`w-full rounded-xl border bg-white/5 py-3 pl-[46px] pr-12 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-blue-500/55 focus:bg-white/[0.08] ${
            pwdError ? 'border-red-500!' : 'border-white/10'
          }`}
        />
        <button
          type="button"
          onClick={() => setShowPwd(!showPwd)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/60"
        >
          <span className="material-symbols-outlined text-lg">{showPwd ? 'visibility_off' : 'visibility'}</span>
        </button>
      </div>

      {/* Remember + Forgot */}
      <div className="flex items-center justify-between">
        <label className="flex cursor-pointer select-none items-center gap-2" title="Keeps you signed in across browser restarts">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 rounded accent-blue-500"
          />
          <span className="text-[13px] text-slate-500">Stay signed in</span>
        </label>
        <button
          type="button"
          onClick={onForgotPassword}
          className="text-[13px] font-semibold text-blue-400 hover:text-blue-300"
        >
          Forgot password?
        </button>
      </div>

      {/* hCaptcha */}
      <div>
        <HCaptcha
          ref={captchaRef}
          sitekey={HCAPTCHA_SITEKEY}
          theme="dark"
          size="normal"
          onVerify={(token) => setCaptchaToken(token)}
          onExpire={() => setCaptchaToken(null)}
        />
      </div>

      {/* Sign In button */}
      <button
        onClick={handleSignIn}
        disabled={loading}
        className="btn-primary relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-[13px] border-none py-3.5 text-sm font-extrabold text-white transition-all duration-200 hover:translate-y-[-2px] hover:shadow-[0_16px_32px_-8px_rgba(59,130,246,0.5)] disabled:translate-y-0 disabled:opacity-55 disabled:cursor-not-allowed"
        style={{ background: 'linear-gradient(135deg, #3b82f6, #7c3aed)' }}
      >
        {loading && <div className="h-[18px] w-[18px] shrink-0 animate-spin rounded-full border-[2.5px] border-white/30 border-t-white" />}
        {loading ? 'Signing in…' : 'Sign In'}
      </button>

      {/* Magic Link option */}
      <button
        onClick={onSwitchToMagicLink}
        className="flex w-full items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-left transition-all hover:translate-y-[-1px] hover:border-white/20 hover:bg-white/10"
      >
        <span className="material-symbols-outlined text-xl text-violet-400">magic_button</span>
        <div>
          <p className="text-[13px] font-bold text-white">Magic Link (Passwordless)</p>
          <p className="text-[11px] text-slate-500">We'll email you a one-click sign-in link</p>
        </div>
      </button>

      {/* OTP option */}
      <button
        onClick={onSwitchToOTP}
        className="flex w-full items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-left transition-all hover:translate-y-[-1px] hover:border-white/20 hover:bg-white/10"
      >
        <span className="material-symbols-outlined text-xl text-emerald-400">pin</span>
        <div>
          <p className="text-[13px] font-bold text-white">One-Time Password (OTP)</p>
          <p className="text-[11px] text-slate-500">Get a 6-digit code sent to your email</p>
        </div>
      </button>

      {/* Error/Success banners */}
      {error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-red-500/30 bg-red-500/[0.12] px-3.5 py-2.5 animate-[fadeIn_0.25s_ease]">
          <span className="material-symbols-outlined shrink-0 text-lg text-red-400">error</span>
          <span className="flex-1 text-[13px] font-semibold leading-snug text-red-300">{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3.5 py-2.5 animate-[fadeIn_0.25s_ease]">
          <span className="material-symbols-outlined shrink-0 text-lg text-emerald-400">check_circle</span>
          <span className="flex-1 text-[13px] font-semibold leading-snug text-emerald-300">{success}</span>
        </div>
      )}
    </div>
  )
}
