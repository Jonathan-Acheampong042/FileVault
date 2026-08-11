import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import AvatarUploader from './AvatarUploader'
import StatsCards from './StatsCards'

export default function IdentityCard() {
  const { user } = useAuth()
  const showToast = useToast()

  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    downloads: 0,
    requests: 0,
    daysActive: 0,
    reactionsLeft: 10,
    filesLiked: 0
  })

  // Auth User state
  const email = user?.email || ''
  const meta = user?.user_metadata || {}
  const displayName = meta.display_name || meta.full_name || meta.name || email.split('@')[0] || 'Student'
  const initials = displayName.slice(0, 2).toUpperCase()
  const photoUrl = meta.avatar_url || meta.picture || meta.photo_url || null
  const isStudent = !!meta.course || !!meta.student_id

  useEffect(() => {
    if (user) {
      loadStats()
    }
  }, [user])

  async function loadStats() {
    if (!user) return
    setLoading(true)
    
    // Days active
    const created = new Date(user.created_at)
    const days = Math.max(0, Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24)))
    
    try {
      // Parallel fetch for downloads and requests count
      const [dlRes, reqRes] = await Promise.all([
        supabase.from('user_downloads').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('upload_requests').select('id', { count: 'exact', head: true }).eq('requester_email', user.email)
      ])
      
      // Calculate local likes/reactions (using fvUserKey logic)
      let likes = 0
      let reactionsLeft = 10
      const userKey = localStorage.getItem('fvUserKey')
      if (userKey) {
        // Here we could query file_reactions or we could trust local storage,
        // but typically reactions/likes logic was client-side or specific to the file vault
        // Let's just stub this for the UI for now as it matches the vanilla app logic
        const storedReactions = JSON.parse(localStorage.getItem('fvReactions') || '{}')
        reactionsLeft = 10 - (Object.values(storedReactions) as any[]).reduce((sum: number, val: any) => sum + (typeof val === 'number' ? val : 0), 0)
        reactionsLeft = Math.max(0, reactionsLeft)
        
        const storedRatings = JSON.parse(localStorage.getItem('fvRatings') || '{}')
        likes = Object.keys(storedRatings).length
      }

      setStats({
        downloads: dlRes.count || 0,
        requests: reqRes.count || 0,
        daysActive: days,
        reactionsLeft,
        filesLiked: likes
      })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function handleAvatarUpload(blob: Blob) {
    if (!user) return
    showToast('Uploading photo...', 'info')
    const fileName = `${user.id}-${Date.now()}.jpg`
    
    try {
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, { upsert: true, contentType: 'image/jpeg' })
        
      if (uploadError) throw uploadError
      
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)
        
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      })
      
      if (updateError) throw updateError
      
      showToast('Profile photo updated', 'success')
      // Note: AuthContext handles onAuthStateChange so user object should automatically refresh
    } catch (err: any) {
      showToast('Failed to upload photo: ' + err.message, 'error')
    }
  }

  async function resendVerification() {
    if (!user?.email) return
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email
    })
    if (error) {
      showToast(error.message, 'error')
    } else {
      showToast('Verification email sent! Check your inbox.', 'success')
    }
  }

  return (
    <div className="space-y-5">
      {/* Identity Card */}
      <div className="rounded-[1.1rem] border border-white/[0.07] bg-white/[0.03] p-6 text-center shadow-lg backdrop-blur-xl">
        <AvatarUploader 
          photoUrl={photoUrl} 
          initials={initials} 
          onUpload={handleAvatarUpload} 
        />
        
        <h2 className="text-[18px] font-extrabold text-slate-100">{displayName}</h2>
        <p className="mt-1 text-[13px] text-slate-500">{email}</p>
        
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {isStudent && (
            <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/25 bg-blue-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-300">
              <span className="material-symbols-outlined text-[12px]">school</span> Student
            </span>
          )}
          {user?.email_confirmed_at ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
              <span className="material-symbols-outlined text-[12px]">verified</span> Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-300">
              <span className="material-symbols-outlined text-[12px]">warning</span> Unverified
            </span>
          )}
        </div>
        
        {user?.created_at && (
          <p className="mt-4 text-[11px] font-medium text-slate-600">
            Joined {new Date(user.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </p>
        )}

        <StatsCards 
          loading={loading}
          {...stats}
        />
      </div>

      {/* Verify Email Banner */}
      {!user?.email_confirmed_at && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
          <span className="material-symbols-outlined shrink-0 text-[22px] text-amber-400">mark_email_unread</span>
          <div className="min-w-0 flex-1">
            <p className="m-0 text-[13px] font-bold text-amber-400">Email not verified</p>
            <p className="m-0 mt-0.5 text-[11px] text-amber-700">Verify your email to unlock all FileVault features.</p>
          </div>
          <button 
            onClick={resendVerification}
            className="shrink-0 rounded-[10px] border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-[12px] font-bold text-amber-400 transition-colors hover:bg-amber-500/20"
          >
            Resend
          </button>
        </div>
      )}
    </div>
  )
}
