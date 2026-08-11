import { useState, useRef } from 'react'
import HCaptcha from '@hcaptcha/react-hcaptcha'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'
import { friendlyError, isValidEmail } from '../../hooks/useAuthHelpers'
import CodeInput from './CodeInput'

const HCAPTCHA_SITEKEY = 'f7dcb47a-d48c-48fe-b802-401c1bc48492'

interface Props {
  onSignedIn: () => void
  onBack: () => void
}

export default function OTPForm({ onSignedIn, onBack }: Props) {
  const showToast = useToast()
  const [step, setStep] = useState<1 | 2>(1)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ text: string; type: 'error' | 'success' } | null>(null)
  const [resending, setResending] = useState(false)
  const captchaRef = useRef<HCaptcha>(null)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)

  async function handleSendCode() {
    setMsg(null)
    if (!email.trim()) { setMsg({ text: 'Please enter your email address.', type: 'error' }); return }
    if (!isValidEmail(email.trim())) { setMsg({ text: 'Please enter a valid email address.', type: 'error' }); return }
    if (!captchaToken) { setMsg({ text: 'Please complete the CAPTCHA.', type: 'error' }); return }

    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true, captchaToken },
    })
    setLoading(false)
    setCaptchaToken(null)
    captchaRef.current?.resetCaptcha()

    if (error) { setMsg({ text: friendlyError(error), type: 'error' }); return }
    setStep(2)
    setMsg(null)
  }

  async function handleVerifyCode(code: string) {
    setMsg(null)
    setLoading(true)
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code,
      type: 'email',
    })
    setLoading(false)

    if (error) {
      setMsg({ text: friendlyError(error), type: 'error' })
      return
    }
    showToast('✓ Signed in!', 'success', 3000)
    onSignedIn()
  }

  async function handleResend() {
    setResending(true)
    await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    })
    showToast('Code resent to ' + email.trim(), 'info', 3000)
    setResending(false)
    setTimeout(() => setResending(false), 30000)
  }

  if (step === 1) {
    return (
      <div>
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 flex h-[52px] w-[52px] items-center justify-center rounded-2xl border border-emerald-400/28 bg-emerald-400/[0.12]">
            <span className="material-symbols-outlined text-[28px] text-emerald-400">pin</span>
          </div>
          <h3 className="mb-1 text-base font-bold text-white">Email OTP Sign-In</h3>
          <p className="text-[13px] text-slate-500">We'll send a 6-digit code to your email. Codes expire in 10 minutes.</p>
        </div>
        <div className="space-y-3">
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35 material-symbols-outlined text-lg">mail</span>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendCode()}
              placeholder="Your email address" autoComplete="email"
              className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-[46px] pr-4 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-blue-500/55 focus:bg-white/[0.08]"
            />
          </div>
          <div>
            <HCaptcha ref={captchaRef} sitekey={HCAPTCHA_SITEKEY} theme="dark" size="normal"
              onVerify={(token) => setCaptchaToken(token)} onExpire={() => setCaptchaToken(null)} />
          </div>
          <button onClick={handleSendCode} disabled={loading}
            className="relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-[13px] border-none py-3.5 text-sm font-extrabold text-white transition-all duration-200 hover:translate-y-[-2px] disabled:opacity-55 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #7c3aed)' }}>
            {loading && <div className="h-[18px] w-[18px] shrink-0 animate-spin rounded-full border-[2.5px] border-white/30 border-t-white" />}
            {loading ? 'Sending code…' : 'Send Code'}
          </button>
        </div>
        {msg && <p className={`mt-3 text-center text-sm ${msg.type === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>{msg.text}</p>}
        <button onClick={onBack} className="mt-2.5 w-full text-center text-xs text-slate-500 hover:text-slate-400">← Back to sign in</button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-5 text-center">
        <div className="mx-auto mb-3 flex h-[52px] w-[52px] items-center justify-center rounded-2xl border border-emerald-400/28 bg-emerald-400/[0.12]">
          <span className="material-symbols-outlined text-[28px] text-emerald-400">mark_email_read</span>
        </div>
        <h3 className="mb-1 text-base font-bold text-white">Enter Your Code</h3>
        <p className="text-[13px] text-slate-500">
          Check your inbox for a 6-digit code sent to <span className="font-bold text-blue-300">{email}</span>
        </p>
      </div>

      <div className="mb-4">
        <CodeInput onComplete={handleVerifyCode} disabled={loading} />
      </div>

      <button onClick={() => handleVerifyCode('')} disabled={loading}
        className="relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-[13px] border-none py-3.5 text-sm font-extrabold text-white transition-all duration-200 hover:translate-y-[-2px] disabled:opacity-55 disabled:cursor-not-allowed"
        style={{ background: 'linear-gradient(135deg, #3b82f6, #7c3aed)' }}>
        {loading && <div className="h-[18px] w-[18px] shrink-0 animate-spin rounded-full border-[2.5px] border-white/30 border-t-white" />}
        {loading ? 'Verifying…' : 'Verify Code'}
      </button>

      <div className="mt-3 flex items-center justify-between">
        <button onClick={() => setStep(1)} className="text-xs text-slate-500 hover:text-slate-400">← Change email</button>
        <button onClick={handleResend} disabled={resending} className="text-xs font-semibold text-blue-400 hover:text-blue-300 disabled:opacity-50">
          {resending ? 'Sent!' : 'Resend code'}
        </button>
      </div>

      {msg && <p className={`mt-3 text-center text-sm ${msg.type === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>{msg.text}</p>}
      <button onClick={onBack} className="mt-2.5 w-full text-center text-xs text-slate-500 hover:text-slate-400">← Back to sign in</button>
    </div>
  )
}
