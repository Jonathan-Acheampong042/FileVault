import { useState, useRef } from 'react'
import HCaptcha from '@hcaptcha/react-hcaptcha'
import { supabase } from '../../lib/supabase'
import { friendlyError, isValidEmail } from '../../hooks/useAuthHelpers'

const HCAPTCHA_SITEKEY = 'f7dcb47a-d48c-48fe-b802-401c1bc48492'

interface Props {
  initialEmail?: string
  onBack: () => void
}

export default function ForgotPasswordForm({ initialEmail, onBack }: Props) {
  const [email, setEmail] = useState(initialEmail || '')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ text: string; type: 'error' | 'success' } | null>(null)
  const captchaRef = useRef<HCaptcha>(null)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)

  async function handleSend() {
    setMsg(null)
    if (!email.trim()) { setMsg({ text: 'Please enter your email address.', type: 'error' }); return }
    if (!isValidEmail(email.trim())) { setMsg({ text: 'Please enter a valid email address (e.g. name@university.edu).', type: 'error' }); return }
    if (!captchaToken) { setMsg({ text: 'Please complete the CAPTCHA.', type: 'error' }); return }

    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin + '/login',
      captchaToken,
    })
    setLoading(false)
    setCaptchaToken(null)
    captchaRef.current?.resetCaptcha()

    if (error) { setMsg({ text: friendlyError(error), type: 'error' }); return }
    setMsg({ text: '✅ Reset link sent! Check your inbox. The link expires in 1 hour.', type: 'success' })
  }

  return (
    <div>
      <div className="mb-5 text-center">
        <div className="mx-auto mb-3 flex h-[52px] w-[52px] items-center justify-center rounded-2xl border border-blue-500/28 bg-blue-500/[0.12]">
          <span className="material-symbols-outlined text-[26px] text-blue-400">mail_lock</span>
        </div>
        <h3 className="mb-1 text-base font-bold text-white">Reset Your Password</h3>
        <p className="text-[13px] text-slate-500">Enter your email and we'll send a password reset link.</p>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35 material-symbols-outlined text-lg">mail</span>
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Your email address" autoComplete="email"
            className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-[46px] pr-4 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-blue-500/55 focus:bg-white/[0.08]"
          />
        </div>
        <div>
          <HCaptcha ref={captchaRef} sitekey={HCAPTCHA_SITEKEY} theme="dark" size="normal"
            onVerify={(token) => setCaptchaToken(token)} onExpire={() => setCaptchaToken(null)} />
        </div>
        <button onClick={handleSend} disabled={loading}
          className="relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-[13px] border-none py-3.5 text-sm font-extrabold text-white transition-all duration-200 hover:translate-y-[-2px] disabled:opacity-55 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg, #3b82f6, #7c3aed)' }}>
          {loading && <div className="h-[18px] w-[18px] shrink-0 animate-spin rounded-full border-[2.5px] border-white/30 border-t-white" />}
          {loading ? 'Sending…' : 'Send Reset Link'}
        </button>
      </div>

      {msg && (
        <p className={`mt-3 text-center text-sm ${msg.type === 'error' ? 'text-red-400' : 'text-emerald-400'}`} role="alert">
          {msg.text}
        </p>
      )}
      <button onClick={onBack} className="mt-3 w-full text-center text-xs text-slate-500 hover:text-slate-400">
        ← Back to sign in
      </button>
    </div>
  )
}
