import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

interface SidebarProps {
  folders: { name: string; count: number }[]
  activeFolder: string | null
  onSelectFolder: (folder: string | null) => void
}

export default function Sidebar({ folders, activeFolder, onSelectFolder }: SidebarProps) {
  const { session, profile, signOut } = useAuth()

  return (
    <aside className="fixed left-0 top-0 hidden h-screen w-64 flex-col border-r border-white/10 bg-slate-950/70 py-8 backdrop-blur-2xl lg:flex">
      <div className="mb-10 flex items-center gap-3 px-6">
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl shadow-lg shadow-primary/40">
          <img src="/filevault-logo.png" alt="FileVault" className="h-full w-full object-contain" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">FileVault</h1>
          <p className="text-[10px] font-extrabold uppercase text-primary/80">Access to Lecture Materials</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-4">
        <button
          onClick={() => onSelectFolder(null)}
          className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
            !activeFolder ? 'bg-primary/15 text-primary' : 'text-slate-300 hover:bg-primary/10 hover:text-primary'
          }`}
        >
          <span className="material-symbols-outlined">folder_shared</span> My Vault
        </button>
        <div className="mt-1 space-y-0.5 pl-2">
          {folders.map((f) => (
            <button
              key={f.name}
              onClick={() => onSelectFolder(f.name)}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs transition-all ${
                activeFolder === f.name ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined shrink-0 text-sm">folder</span>
              <span className="truncate">{f.name}</span>
            </button>
          ))}
        </div>
      </nav>

      <div className="mt-auto border-t border-white/5 px-4 pt-8">
        <Link
          to="/request"
          className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-400 hover:text-primary"
        >
          <span className="material-symbols-outlined">add_circle</span> Request a File
        </Link>

        {!session ? (
          <a href="/login" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-red-400/80">
            <span className="material-symbols-outlined">login</span> Sign In
          </a>
        ) : (
          <div className="mt-2 flex items-center gap-2.5 rounded-2xl border border-white/[0.07] bg-white/[0.04] px-3 py-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-xs font-extrabold uppercase text-white">
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                profile?.displayName.slice(0, 2)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-slate-300">{profile?.displayName}</p>
              <p className="truncate text-[10px] text-slate-500">{profile?.email}</p>
            </div>
            <button onClick={signOut} title="Sign out" aria-label="Sign out" className="shrink-0 text-red-500">
              <span className="material-symbols-outlined text-lg">logout</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
