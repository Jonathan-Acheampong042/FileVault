import React, { useEffect } from 'react'
import ProfileHeader from '../components/profile/ProfileHeader'
import IdentityCard from '../components/profile/IdentityCard'
import AccountSettings from '../components/profile/AccountSettings'
import TwoFactorSetup from '../components/profile/TwoFactorSetup'
import ConnectedAccounts from '../components/profile/ConnectedAccounts'
import NotificationPrefs from '../components/profile/NotificationPrefs'
import ActivitySections from '../components/profile/ActivitySections'
import DangerZone from '../components/profile/DangerZone'
import AchievementBadges, { Badge } from '../components/profile/AchievementBadges'
import { useSettings } from '../context/SettingsContext'

export default function ProfilePage() {
  const { toggleSettings } = useSettings()

  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo(0, 0)
  }, [])

  const badges: Badge[] = [
    // We can fetch these from Supabase in the future
    {
      id: 'early_adopter',
      name: 'Early Adopter',
      desc: 'Joined FileVault early',
      icon: 'rocket_launch',
      colorClass: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
      unlocked: true
    }
  ]

  return (
    <div className="min-h-screen flex flex-col pb-10">
      <ProfileHeader />
      
      <main className="flex-1 px-4 sm:px-6 max-w-2xl mx-auto w-full">
        <div className="animate-[slideUp_0.3s_ease] space-y-5">
          <IdentityCard />
          
          <AchievementBadges badges={badges} />

          {/* Appearance Section */}
          <div className="section-card border border-white/5 bg-white/[0.03] p-5 rounded-[1.1rem]">
            <div className="mb-3.5 flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-wider text-slate-100">
              <span className="material-symbols-outlined text-[18px] text-blue-400">palette</span>
              Appearance
            </div>
            <p className="mb-3.5 text-[12px] leading-[1.6] text-slate-400">
              Theme, contrast, font size, accent color, and compact view are shared across your Vault, Profile, and Request pages.
            </p>
            <button 
              onClick={toggleSettings}
              className="flex w-full items-center justify-center gap-2 rounded-[13px] border border-white/10 bg-white/[0.04] p-3 text-[13px] font-bold text-slate-300 transition-colors hover:bg-white/10"
            >
              <span className="material-symbols-outlined text-[16px]">tune</span>
              Open Display Settings
            </button>
          </div>
          
          <AccountSettings />
          
          <TwoFactorSetup />
          
          <ConnectedAccounts />
          
          <NotificationPrefs />
          
          <ActivitySections />
          
          {/* Session Info */}
          <div className="section-card border border-white/5 bg-white/[0.03] p-5 rounded-[1.1rem]">
            <div className="mb-3.5 flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-wider text-slate-100">
              <span className="material-symbols-outlined text-[18px] text-blue-400">devices</span>
              This Session
            </div>
            <div className="space-y-2 text-[12px]">
              <div className="flex justify-between border-b border-white/[0.05] pb-2">
                <span className="font-bold text-slate-400">Browser</span>
                <span className="text-slate-200">Current Device</span>
              </div>
            </div>
          </div>
          
          <DangerZone />

          <p className="mt-4 text-center text-[11px] text-slate-600">FileVault Account Settings</p>
        </div>
      </main>
    </div>
  )
}
