import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'
import { friendlyError } from '../../hooks/useAuthHelpers'

interface Props {
  onSignedIn: () => void
}

const PROVIDERS: Array<{
  id: 'google' | 'discord' | 'github'
  label: string
  sublabel: string
  icon: React.ReactNode
}> = [
  {
    id: 'google',
    label: 'Continue with Google',
    sublabel: 'Use your Google / Gmail account',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
    ),
  },
  {
    id: 'discord',
    label: 'Continue with Discord',
    sublabel: 'Use your Discord account',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="#5865F2">
        <path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.23A.077.077 0 0 0 8.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026 13.83 13.83 0 0 0 1.226-1.963.074.074 0 0 0-.041-.104 13.175 13.175 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.245.195.372.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028z" />
      </svg>
    ),
  },
  {
    id: 'github',
    label: 'Continue with GitHub',
    sublabel: 'Use your GitHub account',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
      </svg>
    ),
  },
]

export default function SocialLoginButtons({ onSignedIn }: Props) {
  const showToast = useToast()

  async function handleSocial(provider: 'google' | 'discord' | 'github') {
    const redirectTo = window.location.origin + '/login'
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    })
    if (error) showToast(friendlyError(error), 'error', 4000)
  }

  return (
    <div>
      <p className="mb-3.5 text-center text-xs text-slate-500">Sign in instantly with your existing account</p>
      <div className="space-y-3">
        {PROVIDERS.map(({ id, label, sublabel, icon }) => (
          <button
            key={id}
            onClick={() => handleSocial(id)}
            className="flex w-full items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-left text-[13px] font-semibold text-white/80 transition-all hover:translate-y-[-1px] hover:border-white/20 hover:bg-white/10"
          >
            {icon}
            <div className="text-left">
              <p className="text-[13px] font-bold text-white">{label}</p>
              <p className="text-[11px] text-slate-500">{sublabel}</p>
            </div>
          </button>
        ))}
      </div>
      <p className="mt-3.5 text-center text-[11px] text-slate-700">After signing in you'll be directed to your student vault.</p>
    </div>
  )
}
