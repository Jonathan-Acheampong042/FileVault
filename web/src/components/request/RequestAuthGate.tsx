import { Link } from 'react-router-dom'

export default function RequestAuthGate() {
  return (
    <div className="animate-[fadeInUp_0.45s_ease-out_both]">
      <div className="flex flex-col items-center text-center py-2 pb-1">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[20px] border border-blue-500/25 bg-gradient-to-br from-blue-500/15 to-violet-500/15">
          <span className="material-symbols-outlined text-[30px] text-blue-300">lock</span>
        </div>
        <h2 className="mb-2 text-lg font-extrabold text-white">Sign in to Request Files</h2>
        <p className="mb-6 max-w-[320px] text-[13px] leading-relaxed text-slate-500">
          You need a FileVault account to submit file requests. It's free and only takes a moment.
        </p>

        <Link
          to="/login?next=/request"
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
          to="/login?tab=signup&next=/request"
          className="flex w-full items-center justify-center gap-2 rounded-[13px] border border-white/10 bg-white/5 p-[13px] text-sm font-extrabold text-slate-400 transition-all hover:-translate-y-[1px] hover:bg-white/10 hover:text-slate-200"
        >
          <span className="material-symbols-outlined text-[17px]">person_add</span>
          Create a Free Account
        </Link>
      </div>

      <div className="mt-5 flex flex-col gap-2 rounded-[14px] border border-blue-500/10 bg-blue-500/[0.06] px-4 py-3.5 text-left">
        <div className="flex items-center gap-2.5 text-xs font-medium text-slate-400">
          <span className="material-symbols-outlined shrink-0 text-[16px] text-blue-400">notifications_active</span>
          Get notified when your requested file is uploaded
        </div>
        <div className="flex items-center gap-2.5 text-xs font-medium text-slate-400">
          <span className="material-symbols-outlined shrink-0 text-[16px] text-blue-400">history</span>
          Track the status of all your past requests
        </div>
        <div className="flex items-center gap-2.5 text-xs font-medium text-slate-400">
          <span className="material-symbols-outlined shrink-0 text-[16px] text-blue-400">verified</span>
          Verified requests are prioritised by the manager
        </div>
      </div>

      {/* Blurred Preview Form */}
      <div className="relative mt-4 overflow-hidden rounded-[14px] pointer-events-none select-none">
        <div className="opacity-35 blur-[3px] py-1">
          <div className="mb-[18px]">
            <label className="mb-[7px] block text-[11px] font-bold uppercase tracking-widest text-slate-400">File / Material Name</label>
            <input 
              disabled 
              className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white" 
              placeholder="e.g. UGBS 301 Lecture 5 Slides" 
            />
          </div>
          <div className="mb-[18px]">
            <label className="mb-[7px] block text-[11px] font-bold uppercase tracking-widest text-slate-400">Why do you need it?</label>
            <textarea 
              disabled 
              rows={2} 
              className="w-full resize-none rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white" 
              placeholder="e.g. Missed class due to illness..." 
            />
          </div>
          <div className="h-12 w-full rounded-[13px] bg-gradient-to-br from-blue-500 to-violet-500 p-3"></div>
        </div>
        <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-b from-slate-900/10 via-slate-900/70 to-slate-900/95 pb-4">
          <span className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
            <span className="material-symbols-outlined text-[14px]">lock</span>
            Sign in to unlock this form
          </span>
        </div>
      </div>
    </div>
  )
}
