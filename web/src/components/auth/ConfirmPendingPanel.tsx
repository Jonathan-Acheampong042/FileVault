import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { friendlyError } from '../../hooks/useAuthHelpers'

interface Props {
  email: string
  onBackToSignUp: () => void
}

export default function ConfirmPendingPanel({ email, onBackToSignUp }: Props) {
  const [msg, setMsg] = useState<{ text: string; type: 'error' | 'success' } | null>(null)
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(false)

  async function handleResend() {
    setMsg(null)
    setLoading(true)
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    setLoading(false)

    if (error) { setMsg({ text: friendlyError(error), type: 'error' }); return }
    setMsg({ text: '✉️ Sent! Check your inbox (and spam folder).', type: 'success' })
    setCooldown(true)
    setTimeout(() => setCooldown(false), 30000)
  }

  function handleBack() {
    try { sessionStorage.removeItem('fv_pending_confirm_email') } catch {}
    onBackToSignUp()
  }

  return (
    <div className="animate-[fadeIn_0.35s_ease]">
      <div className="mb-5 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[20px] border border-blue-500/30 bg-gradient-to-br from-blue-500/[0.18] to-violet-500/[0.18]">
          <span className="material-symbols-outlined animate-[bounce-mail_2.2s_ease-in-out_infinite] text-[32px] text-blue-400">
            mark_email_unread
          </span>
        </div>
        <h3 className="mb-1.5 text-lg font-extrabold text-white">Check your inbox</h3>
        <p className="mb-3.5 text-[13px] leading-snug text-slate-500">We sent a confirmation link to</p>
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/25 bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-300 break-all">
            <span className="material-symbols-outlined text-sm">mail</span>
            {email}
          </span>
        </div>
      </div>

      {/* Steps */}
      <div className="mb-4.5 rounded-[14px] border border-white/[0.07] bg-white/[0.03] px-3.5 py-1">
        {[
          { num: '1', title: 'Open the email from FileVault', sub: 'Subject: "Confirm Your Email Address"' },
          { num: '2', title: 'Click the confirmation link', sub: "You'll be signed in automatically" },
          { num: '3', title: 'Not in your inbox?', sub: 'Check your spam or junk folder' },
        ].map(({ num, title, sub }) => (
          <div key={num} className="flex items-start gap-2.5 border-b border-white/5 py-2.5 last:border-b-0">
            <div className="mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border border-blue-500/30 bg-blue-500/15 text-[11px] font-extrabold text-blue-400">
              {num}
            </div>
            <div>
              <p className="text-[13px] font-semibold text-slate-300">{title}</p>
              <p className="text-[11px] text-slate-500">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Resend button */}
      <button
        onClick={handleResend}
        disabled={loading || cooldown}
        className="flex w-full items-center justify-center gap-2 rounded-[13px] border border-blue-500/30 bg-blue-500/[0.18] py-3.5 text-sm font-extrabold text-blue-300 transition-all disabled:opacity-55 disabled:cursor-not-allowed"
      >
        {loading && <div className="h-[18px] w-[18px] shrink-0 animate-spin rounded-full border-[2.5px] border-blue-300/30 border-t-blue-300" />}
        <span className="material-symbols-outlined text-base">send</span>
        {loading ? 'Sending…' : 'Resend confirmation email'}
      </button>

      {msg && (
        <p className={`mt-3 text-center text-sm ${msg.type === 'error' ? 'text-red-400' : 'text-emerald-400'}`} role="alert">
          {msg.text}
        </p>
      )}

      <button onClick={handleBack} className="mt-2.5 w-full text-center text-xs text-slate-600 hover:text-slate-400">
        ← Used a different email? Sign up again
      </button>
    </div>
  )
}
