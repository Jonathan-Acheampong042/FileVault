import { Link, useLocation } from 'react-router-dom'

export default function ChatAuthGate() {
  const location = useLocation()
  // Ensure the next path is set correctly to where they currently are, or fallback to root
  const nextParam = location.pathname !== '/login' ? location.pathname : '/'

  return (
    <div className="animate-[fadeInUp_0.45s_ease-out_both] p-4 sm:p-5 h-full flex flex-col justify-center">
      <div className="flex flex-col items-center text-center py-2 pb-1">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[20px] border border-blue-500/25 bg-gradient-to-br from-blue-500/15 to-violet-500/15">
          <span className="material-symbols-outlined text-[30px] text-blue-300">lock</span>
        </div>
        <h2 className="mb-2 text-lg font-extrabold text-white">Sign in to Use AI Chat</h2>
        <p className="mb-6 max-w-[320px] text-[13px] leading-relaxed text-slate-500">
          You need a FileVault account to use the AI assistant. It's free and only takes a moment.
        </p>

        <Link
          to={`/login?next=${encodeURIComponent(nextParam)}`}
          className="mb-2.5 flex w-full items-center justify-center gap-2 rounded-[13px] bg-gradient-to-br from-blue-500 to-violet-500 p-[13px] text-sm font-extrabold text-white transition-all hover:-translate-y-[1px] hover:opacity-90"
        >
          <span className="material-symbols-outlined text-[17px]">login</span>
          Sign In
        </Link>
        
        <div className="my-1 flex w-full items-center gap-2.5 mb-3.5">
          <span className="flex-1 h-px bg-white/5"></span>
          <p className="whitespace-nowrap text-[11px] font-semibold text-slate-600">or</p>
          <span className="flex-1 h-px bg-white/5"></span>
        </div>

        <Link
          to={`/login?tab=signup&next=${encodeURIComponent(nextParam)}`}
          className="flex w-full items-center justify-center gap-2 rounded-[13px] border border-white/10 bg-white/5 p-[13px] text-sm font-extrabold text-slate-400 transition-all hover:-translate-y-[1px] hover:bg-white/10 hover:text-slate-200"
        >
          <span className="material-symbols-outlined text-[17px]">person_add</span>
          Create a Free Account
        </Link>
      </div>

      <div className="mt-5 flex flex-col gap-2 rounded-[14px] border border-blue-500/10 bg-blue-500/[0.06] px-4 py-3.5 text-left">
        <div className="flex items-center gap-2.5 text-xs font-medium text-slate-400">
          <span className="material-symbols-outlined shrink-0 text-[16px] text-blue-400">auto_awesome</span>
          Ask questions about your study materials
        </div>
        <div className="flex items-center gap-2.5 text-xs font-medium text-slate-400">
          <span className="material-symbols-outlined shrink-0 text-[16px] text-blue-400">quiz</span>
          Generate practice quizzes instantly
        </div>
        <div className="flex items-center gap-2.5 text-xs font-medium text-slate-400">
          <span className="material-symbols-outlined shrink-0 text-[16px] text-blue-400">history</span>
          Track your learning history
        </div>
      </div>
    </div>
  )
}
