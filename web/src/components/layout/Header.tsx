import { useState } from 'react'
import SearchBar from '../vault/SearchBar'
import SettingsPanel from './SettingsPanel'
import { useAuth } from '../../context/AuthContext'
import { useSettings } from '../../context/SettingsContext'

interface HeaderProps {
  search: string
  onSearchChange: (v: string) => void
  unreadCount?: number
  onOpenNotifications?: () => void
}

export default function Header({ search, onSearchChange, unreadCount = 0, onOpenNotifications }: HeaderProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const { session, profile, signOut } = useAuth()
  const { theme, toggleTheme } = useSettings()

  return (
    <header className="sticky top-0 z-50 flex w-full items-center gap-3 border-b border-white/10 bg-slate-950/60 px-4 py-3 backdrop-blur-2xl sm:px-6">
      <SearchBar value={search} onChange={onSearchChange} />

      <div className="flex shrink-0 items-center gap-1">
        {onOpenNotifications && (
          <button
            onClick={onOpenNotifications}
            title="Notifications"
            aria-label="Open notifications"
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:border-primary/30 hover:bg-primary/20 hover:text-primary"
          >
            <span className="material-symbols-outlined text-[18px]">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full border border-slate-950 bg-red-500" />
            )}
          </button>
        )}
        <button
          onClick={toggleTheme}
          title="Toggle light/dark mode"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:border-primary/30 hover:bg-primary/20 hover:text-primary"
        >
          <span className="material-symbols-outlined text-[18px]">
            {theme === 'light' ? 'dark_mode' : 'light_mode'}
          </span>
        </button>
        <div className="relative">
          <button
            onClick={() => setSettingsOpen((o) => !o)}
            title="Display settings"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:border-primary/30 hover:bg-primary/20 hover:text-primary"
          >
            <span className="material-symbols-outlined text-[18px]">palette</span>
          </button>
          <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        </div>
      </div>

      {session && profile && (
        <div className="relative shrink-0">
          <button
            onClick={() => setProfileOpen((o) => !o)}
            className="flex max-w-[160px] items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] py-1 pl-1 pr-2"
          >
            <span className="flex h-6.5 w-6.5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-[11px] font-extrabold uppercase text-white">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                profile.displayName.slice(0, 2)
              )}
            </span>
            <span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-300">
              {profile.displayName.length > 14 ? `${profile.displayName.slice(0, 14)}…` : profile.displayName}
            </span>
            <span className="material-symbols-outlined text-sm text-slate-500">expand_more</span>
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-[calc(100%+8px)] z-[9999] min-w-[220px] overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 shadow-2xl backdrop-blur-xl">
              <div className="border-b border-white/[0.07] p-4">
                <p className="truncate text-[13px] font-extrabold text-slate-200">{profile.displayName}</p>
                <p className="mt-0.5 truncate text-[11px] text-slate-500">{profile.email}</p>
              </div>
              <div className="p-1.5">
                <a href="/profile" className="flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-[13px] font-semibold text-slate-400 hover:bg-white/5 hover:text-slate-200">
                  <span className="material-symbols-outlined text-[17px]">manage_accounts</span> My Profile
                </a>
                <button
                  onClick={signOut}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-left text-[13px] font-semibold text-red-400 hover:bg-red-500/10"
                >
                  <span className="material-symbols-outlined text-[17px]">logout</span> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
