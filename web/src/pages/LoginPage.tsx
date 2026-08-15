import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { sanitizeNextPage } from '../hooks/useAuthHelpers'
import SignInForm from '../components/auth/SignInForm'
import SignUpForm from '../components/auth/SignUpForm'
import SocialLoginButtons from '../components/auth/SocialLoginButtons'
import MagicLinkForm from '../components/auth/MagicLinkForm'
import OTPForm from '../components/auth/OTPForm'
import ForgotPasswordForm from '../components/auth/ForgotPasswordForm'
import ResetPasswordForm from '../components/auth/ResetPasswordForm'
import ConfirmPendingPanel from '../components/auth/ConfirmPendingPanel'
import MFAChallengeModal from '../components/auth/MFAChallengeModal'

type StudentTab = 'signin' | 'signup' | 'social' | 'magiclink' | 'otp'
type Section = 'student' | 'forgot' | 'reset' | 'confirmPending' | 'adminChoice' | 'mfaOptIn'

/** Capture the initial URL hash BEFORE Supabase clears it (via detectSessionInUrl). */
const _initialHash = window.location.hash

export default function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const showToast = useToast()

  // ── State ──
  const [section, setSection] = useState<Section>('student')
  const [studentTab, setStudentTab] = useState<StudentTab>('signin')
  const [confirmEmail, setConfirmEmail] = useState('')
  const [mfa, setMfa] = useState<{ factorId: string; challengeId: string } | null>(null)

  // Recovery flow flags
  const recoveryFromHash = useRef(_initialHash.includes('type=recovery'))
  const inRecoveryFlow = useRef(false)
  const recoveryCompleted = useRef(false)
  const redirecting = useRef(false)

  // ── ?tab=signup and ?next= support ──
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam === 'signup') setStudentTab('signup')

    const nextParam = sanitizeNextPage(searchParams.get('next'))
    if (nextParam) {
      try { sessionStorage.setItem('fv_next_after_login', nextParam) } catch {}
    }
  }, [searchParams])

  // ── Handle URL hash tokens on mount ──
  useEffect(() => {
    if (_initialHash.includes('type=recovery')) {
      inRecoveryFlow.current = true
      recoveryFromHash.current = true
      setSection('reset')
      return
    }

    // Magic link / signup confirmation — let onAuthStateChange handle it
    const params = new URLSearchParams(_initialHash.replace('#', '?'))
    if (params.get('type') === 'magiclink' || params.get('type') === 'signup' || params.get('access_token')) {
      return
    }

    // Check for pending confirmation
    try {
      const pendingEmail = sessionStorage.getItem('fv_pending_confirm_email')
      if (pendingEmail) {
        setConfirmEmail(pendingEmail)
        setSection('confirmPending')
      }
    } catch {}
  }, [])

  // ── Auth state change listener ──
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        inRecoveryFlow.current = true
        setSection('reset')
        return
      }
      if (event === 'SIGNED_IN' && session) {
        if (inRecoveryFlow.current && !recoveryCompleted.current) return
        if (mfa) return
        await routeUser()
      }
    })
    return () => subscription.unsubscribe()
  }, [mfa])

  // ── Pagehide safety net for recovery flow ──
  useEffect(() => {
    function handlePageHide() {
      if (inRecoveryFlow.current && !recoveryCompleted.current && recoveryFromHash.current) {
        supabase.auth.signOut({ scope: 'local' })
      }
    }
    window.addEventListener('pagehide', handlePageHide)
    return () => window.removeEventListener('pagehide', handlePageHide)
  }, [])

  // ── Route user after authentication ──
  async function routeUser() {
    if (redirecting.current) return
    redirecting.current = true

    try { sessionStorage.removeItem('fv_pending_confirm_email') } catch {}

    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { redirecting.current = false; return }

    // Check role
    let isAdmin = false
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', authUser.id)
        .single()
      if (profile?.role === 'admin' || profile?.role === 'manager') isAdmin = true
      localStorage.setItem('fv_user_role', profile?.role || 'student')
    } catch {
      localStorage.setItem('fv_user_role', 'student')
    }

    // Get destination
    let dest: string
    try {
      dest = sanitizeNextPage(sessionStorage.getItem('fv_next_after_login')) || '/'
      sessionStorage.removeItem('fv_next_after_login')
    } catch {
      dest = '/'
    }

    if (isAdmin) {
      showToast('✓ Welcome, Admin!', 'success', 3000)
      setSection('adminChoice')
    } else {
      sessionStorage.setItem('fv_just_signed_in', authUser.email || '1')
      showToast('✓ Signed in! Welcome back.', 'success', 3000)
      navigate(dest, { replace: true })
    }
  }

  // ── Tab switching ──
  const TAB_LABELS: Array<{ id: StudentTab; label: string }> = [
    { id: 'signin', label: 'Sign In' },
    { id: 'signup', label: 'Create Account' },
    { id: 'social', label: 'Social Login' },
  ]

  // ── Dynamic header ──
  let title = 'Sign In to FileVault'
  let subtitle = 'Access your lecture materials'
  if (section === 'forgot') { title = 'Reset Password'; subtitle = "We'll send a reset link to your email" }
  if (section === 'reset') { title = 'Set New Password'; subtitle = 'Choose a strong new password below' }
  if (section === 'confirmPending') { title = 'Almost there!'; subtitle = 'Confirm your email to activate your account' }

  const showTabs = section === 'student' && !['magiclink', 'otp'].includes(studentTab)

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-x-hidden p-4">
      {/* Background */}
      <div className="fixed inset-0 -z-20 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/filevault-logo.png')", filter: 'blur(60px) saturate(1.4)', opacity: 0.08 }} />
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" />

      {/* Back button */}
      <a
        href="/"
        className="fixed left-5 top-5 z-10 flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.07] px-4 py-2 text-sm font-semibold text-white/60 backdrop-blur-sm transition-all hover:border-white/25 hover:bg-white/15 hover:text-white"
      >
        <span className="material-symbols-outlined text-base">arrow_back</span>
        FileVault
      </a>

      {/* Card */}
      <div className="relative w-full max-w-md animate-[slideUp_0.45s_cubic-bezier(0.22,1,0.36,1)_forwards]">
        {/* Glow halo */}
        <div className="absolute -inset-1 rounded-3xl opacity-25 blur-2xl" style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6, #06b6d4)' }} />

        <div className="glass-card relative rounded-3xl p-7">
          {/* Logo + Title */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 h-14 w-14 overflow-hidden rounded-2xl shadow-lg" style={{ boxShadow: '0 8px 32px rgba(59,130,246,0.3)' }}>
              <img src="/filevault-logo.png" alt="FileVault" className="h-full w-full object-contain" />
            </div>
            <h1 className="text-2xl font-extrabold text-white">{title}</h1>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>

          {/* Student section */}
          {section === 'student' && (
            <div>
              {/* Tab pills */}
              {showTabs && (
                <div className="mb-5 flex gap-2">
                  {TAB_LABELS.map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => setStudentTab(id)}
                      className={`flex-1 rounded-[10px] border px-2 py-2.5 text-xs font-bold transition-all ${
                        studentTab === id
                          ? 'border-blue-500/35 bg-blue-500/[0.22] text-blue-300'
                          : 'border-white/[0.07] bg-white/[0.04] text-slate-500 hover:bg-white/[0.08] hover:text-slate-400'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {/* Active panel */}
              <div className="animate-[fadeIn_0.3s_ease]">
                {studentTab === 'signin' && (
                  <SignInForm
                    onSignedIn={routeUser}
                    onForgotPassword={() => setSection('forgot')}
                    onSwitchToMagicLink={() => setStudentTab('magiclink')}
                    onSwitchToOTP={() => setStudentTab('otp')}
                    onMfaRequired={(fId, cId) => setMfa({ factorId: fId, challengeId: cId })}
                  />
                )}
                {studentTab === 'signup' && (
                  <SignUpForm
                    onConfirmPending={(email) => {
                      setConfirmEmail(email)
                      setSection('confirmPending')
                    }}
                  />
                )}
                {studentTab === 'social' && <SocialLoginButtons onSignedIn={routeUser} />}
                {studentTab === 'magiclink' && <MagicLinkForm onBack={() => setStudentTab('signin')} />}
                {studentTab === 'otp' && <OTPForm onSignedIn={routeUser} onBack={() => setStudentTab('signin')} />}
              </div>
            </div>
          )}

          {/* Forgot password */}
          {section === 'forgot' && (
            <ForgotPasswordForm onBack={() => setSection('student')} />
          )}

          {/* Reset password */}
          {section === 'reset' && (
            <ResetPasswordForm
              onComplete={() => {
                recoveryCompleted.current = true
                navigate('/', { replace: true })
              }}
              onCancel={() => {
                inRecoveryFlow.current = false
                recoveryCompleted.current = false
                setSection('student')
              }}
            />
          )}

          {/* Confirm pending */}
          {section === 'confirmPending' && (
            <ConfirmPendingPanel
              email={confirmEmail}
              onBackToSignUp={() => {
                setSection('student')
                setStudentTab('signup')
              }}
            />
          )}

          {/* Admin Choice */}
          {section === 'adminChoice' && (
            <div className="animate-[fadeIn_0.3s_ease] text-center">
              <h2 className="mb-4 text-xl font-bold text-white">Where to?</h2>
              <p className="mb-6 text-sm text-slate-400">Choose how you'd like to browse today.</p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => navigate('/manager')}
                  className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition-all hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/25"
                >
                  Manager Dashboard
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-white transition-all hover:bg-white/10"
                >
                  Student Vault
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-5 animate-[fadeIn_0.6s_ease-out_0.2s_both] text-center space-y-2">
          <p className="text-xs text-slate-700">
            FileVault · Built by <span className="font-semibold text-slate-600">Jonathan Acheampong</span>
          </p>
          <div className="flex justify-center gap-4 text-[11px] font-semibold text-slate-600">
            <a href="/terms.html" target="_blank" rel="noopener noreferrer" className="hover:text-slate-400 transition-colors">Terms of Service</a>
            <span className="text-slate-800">·</span>
            <a href="/privacy.html" target="_blank" rel="noopener noreferrer" className="hover:text-slate-400 transition-colors">Privacy Policy</a>
          </div>
        </div>
      </div>

      {/* MFA modal */}
      {mfa && (
        <MFAChallengeModal
          factorId={mfa.factorId}
          challengeId={mfa.challengeId}
          onVerified={() => {
            setMfa(null)
            routeUser()
          }}
          onCancel={() => {
            setMfa(null)
            redirecting.current = false
          }}
        />
      )}
    </div>
  )
}
