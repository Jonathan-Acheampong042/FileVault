import { useState, useRef } from 'react'
import HCaptcha from '@hcaptcha/react-hcaptcha'
import { supabase } from '../../lib/supabase'
import { friendlyError, isValidEmail, checkPwdStrength } from '../../hooks/useAuthHelpers'
import PasswordStrengthMeter from './PasswordStrengthMeter'

const HCAPTCHA_SITEKEY = 'f7dcb47a-d48c-48fe-b802-401c1bc48492'

interface Props {
  onConfirmPending: (email: string) => void
}

export default function SignUpForm({ onConfirmPending }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ text: string; type: 'error' | 'success' } | null>(null)
  const captchaRef = useRef<HCaptcha>(null)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)

  async function handleSignUp() {
    setMsg(null)
    if (!name.trim()) { setMsg({ text: 'Please enter your full name.', type: 'error' }); return }
    if (!email.trim()) { setMsg({ text: 'Please enter your email address.', type: 'error' }); return }
    if (!isValidEmail(email.trim())) { setMsg({ text: 'Please enter a valid email address (e.g. name@university.edu).', type: 'error' }); return }

    const pwdCheck = checkPwdStrength(password)
    if (pwdCheck.score < 4) {
      setMsg({ text: 'Your password does not meet all the requirements below. Please strengthen it.', type: 'error' })
      return
    }
    if (!captchaToken) { setMsg({ text: 'Please complete the CAPTCHA.', type: 'error' }); return }

    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { display_name: name.trim() },
        captchaToken,
      },
    })
    setLoading(false)
    setCaptchaToken(null)
    captchaRef.current?.resetCaptcha()

    if (error) {
      setMsg({ text: friendlyError(error), type: 'error' })
      return
    }

    try { sessionStorage.setItem('fv_pending_confirm_email', email.trim()) } catch {}
    onConfirmPending(email.trim())
  }

  return (
    <div className="space-y-3">
      {/* Name */}
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35 material-symbols-outlined text-lg">badge</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your full name"
          autoComplete="name"
          className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-[46px] pr-4 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-blue-500/55 focus:bg-white/[0.08]"
        />
      </div>

      {/* Email */}
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35 material-symbols-outlined text-lg">mail</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email address"
          autoComplete="email"
          className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-[46px] pr-4 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-blue-500/55 focus:bg-white/[0.08]"
        />
      </div>

      {/* Password */}
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35 material-symbols-outlined text-lg">lock</span>
        <input
          type={showPwd ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSignUp()}
          placeholder="Choose a password"
          autoComplete="new-password"
          className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-[46px] pr-12 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-blue-500/55 focus:bg-white/[0.08]"
        />
        <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/60">
          <span className="material-symbols-outlined text-lg">{showPwd ? 'visibility_off' : 'visibility'}</span>
        </button>
      </div>

      <PasswordStrengthMeter password={password} visible={password.length > 0} />

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

      <button
        onClick={handleSignUp}
        disabled={loading}
        className="relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-[13px] border-none py-3.5 text-sm font-extrabold text-white transition-all duration-200 hover:translate-y-[-2px] hover:shadow-[0_16px_32px_-8px_rgba(59,130,246,0.5)] disabled:translate-y-0 disabled:opacity-55 disabled:cursor-not-allowed"
        style={{ background: 'linear-gradient(135deg, #3b82f6, #7c3aed)' }}
      >
        {loading && <div className="h-[18px] w-[18px] shrink-0 animate-spin rounded-full border-[2.5px] border-white/30 border-t-white" />}
        {loading ? 'Creating account…' : 'Create Account'}
      </button>

      {msg && (
        <p className={`mt-1 text-center text-sm ${msg.type === 'error' ? 'text-red-400' : 'text-emerald-400'}`} role="alert">
          {msg.text}
        </p>
      )}
    </div>
  )
}
