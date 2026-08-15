import React, { useEffect, useState } from 'react'
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
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { getUserKey } from '../utils/userKey'

export default function ProfilePage() {
  const { toggleSettings } = useSettings()
  const { user } = useAuth()
  const [badges, setBadges] = useState<Badge[]>([])

  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    async function loadAchievements() {
      // 1. Read localStorage states
      let bookmarksCount = 0
      let pinsCount = 0
      let viewsCount = 0
      let hasChatted = false

      try {
        const bookmarks = JSON.parse(localStorage.getItem('fvBookmarks') || '[]')
        bookmarksCount = Array.isArray(bookmarks) ? bookmarks.length : 0
      } catch {}

      try {
        const pins = JSON.parse(localStorage.getItem('fvPinnedMeta') || '[]')
        pinsCount = Array.isArray(pins) ? pins.length : 0
      } catch {}

      try {
        const views = JSON.parse(localStorage.getItem('fvRecentViewed') || '[]')
        viewsCount = Array.isArray(views) ? views.length : 0
      } catch {}

      try {
        const chatHistory = JSON.parse(localStorage.getItem('fvChatHistory') || '[]')
        hasChatted = Array.isArray(chatHistory) && chatHistory.length > 0
      } catch {}

      // 2. Fetch database stats
      let requestCount = 0
      let ratingsCount = 0

      if (user?.email) {
        try {
          const { count } = await supabase
            .from('upload_requests')
            .select('id', { count: 'exact', head: true })
            .eq('requester_email', user.email)
          requestCount = count || 0
        } catch {}
      }

      try {
        const userKey = getUserKey()
        const { count } = await supabase
          .from('file_ratings')
          .select('file_id', { count: 'exact', head: true })
          .eq('user_key', userKey)
        ratingsCount = count || 0
      } catch {}

      // 3. Define badges
      const list: Badge[] = [
        {
          id: 'early_adopter',
          name: 'Early Adopter',
          desc: 'Joined FileVault early',
          icon: 'rocket_launch',
          colorClass: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
          unlocked: true
        },
        {
          id: 'knowledge_seeker',
          name: 'Knowledge Seeker',
          desc: 'Viewed 5+ materials',
          icon: 'menu_book',
          colorClass: 'border-purple-500/30 bg-purple-500/10 text-purple-400',
          unlocked: viewsCount >= 5
        },
        {
          id: 'scholars_stash',
          name: 'Scholar\'s Stash',
          desc: 'Bookmarked 3+ files',
          icon: 'bookmark',
          colorClass: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
          unlocked: bookmarksCount >= 3
        },
        {
          id: 'offline_scholar',
          name: 'Offline Scholar',
          desc: 'Pinned 3+ files offline',
          icon: 'offline_pin',
          colorClass: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
          unlocked: pinsCount >= 3
        },
        {
          id: 'rate_critic',
          name: 'Rate Critic',
          desc: 'Rated a lecture file',
          icon: 'star',
          colorClass: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400',
          unlocked: ratingsCount >= 1
        },
        {
          id: 'active_participant',
          name: 'Active Participant',
          desc: 'Requested a new file',
          icon: 'contact_support',
          colorClass: 'border-rose-500/30 bg-rose-500/10 text-rose-400',
          unlocked: requestCount >= 1
        },
        {
          id: 'engaged_student',
          name: 'Engaged Student',
          desc: 'Chatted with AI assistant',
          icon: 'smart_toy',
          colorClass: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400',
          unlocked: hasChatted
        }
      ]

      setBadges(list)
    }

    loadAchievements()
  }, [user])

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
