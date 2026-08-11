import { useAuth } from '../../context/AuthContext'

interface MobileNavProps {
  onSelectAll: () => void
  onFocusSearch: () => void
}

export default function MobileNav({ onSelectAll, onFocusSearch }: MobileNavProps) {
  const { session, profile } = useAuth()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-white/10 bg-slate-950/80 px-2 py-2 backdrop-blur-2xl lg:hidden" style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
      <button onClick={onSelectAll} className="flex flex-col items-center gap-0.5 px-3 py-1 text-primary">
        <span className="material-symbols-outlined text-xl">folder_shared</span>
        <span className="text-[9px] font-bold uppercase">Vault</span>
      </button>
      <button onClick={onFocusSearch} className="flex flex-col items-center gap-0.5 px-3 py-1 text-slate-400">
        <span className="material-symbols-outlined text-xl">search</span>
        <span className="text-[9px] font-bold uppercase">Search</span>
      </button>
      <a href="/upload-request" className="flex flex-col items-center gap-0.5 px-3 py-1 text-slate-400">
        <span className="material-symbols-outlined text-xl">upload_file</span>
        <span className="text-[9px] font-bold uppercase">Request</span>
      </a>
      {session ? (
        <a href="/profile" className="flex flex-col items-center gap-0.5 px-3 py-1 text-primary">
          <span className="flex h-[22px] w-[22px] items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-[9px] font-extrabold uppercase text-white">
            {profile?.avatarUrl ? <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" /> : profile?.displayName.slice(0, 2)}
          </span>
          <span className="text-[9px] font-bold uppercase">Me</span>
        </a>
      ) : (
        <a href="/login" className="flex flex-col items-center gap-0.5 px-3 py-1 text-slate-400">
          <span className="material-symbols-outlined text-xl">login</span>
          <span className="text-[9px] font-bold uppercase">Sign In</span>
        </a>
      )}
    </nav>
  )
}
