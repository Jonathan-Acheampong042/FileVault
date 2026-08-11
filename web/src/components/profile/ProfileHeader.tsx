import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useSettings } from '../../context/SettingsContext'
import SettingsPanel from '../layout/SettingsPanel'

interface ProfileHeaderProps {
  compact?: boolean
}

export default function ProfileHeader({ compact = false }: ProfileHeaderProps) {
  const navigate = useNavigate()
  const { toggleSettings, settingsOpen, setSettingsOpen } = useSettings()
  const { profile, signOut } = useAuth()
  const [profileOpen, setProfileOpen] = useState(false)

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  if (compact && profile) {
    return (
      <div className="relative shrink-0">
        <button
          onClick={() => setProfileOpen((o) => !o)}
          className="flex max-w-[160px] items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] py-1 pl-1 pr-2"
        >
          <span className="flex h-6.5 w-6.5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-[11px] font-extrabold uppercase text-white">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              profile.displayName.slice(0, 2).toUpperCase()
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
              <Link to="/profile" className="flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-[13px] font-semibold text-slate-400 hover:bg-white/5 hover:text-slate-200">
                <span className="material-symbols-outlined text-[17px]">manage_accounts</span> My Profile
              </Link>
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-left text-[13px] font-semibold text-red-400 hover:bg-red-500/10"
              >
                <span className="material-symbols-outlined text-[17px]">logout</span> Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="profile-header sticky top-0 z-40 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5 pb-3 pt-4 mb-6">
      <header className="flex w-full max-w-2xl mx-auto items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-slate-400 transition hover:text-white"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          <span className="text-[13px] font-bold">Back to Vault</span>
        </button>
        
        <div className="flex items-center gap-2 relative">
          <button
            onClick={toggleSettings}
            title="Display settings"
            aria-label="Open display settings"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition hover:border-blue-500/30 hover:bg-blue-500/20 hover:text-blue-500"
          >
            <span className="material-symbols-outlined text-[18px]">palette</span>
          </button>
          <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
          <img
            src="/filevault%20logo.png"
            alt="FileVault"
            className="h-[22px] w-[22px] shrink-0 rounded-md object-contain"
          />
          <span className="text-[14px] font-extrabold text-slate-100">My Profile</span>
        </div>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 text-[13px] font-bold text-slate-400 transition hover:text-red-400"
        >
          <span className="material-symbols-outlined text-[14px]">logout</span>
          Sign out
        </button>
      </header>
    </div>
  )
}
