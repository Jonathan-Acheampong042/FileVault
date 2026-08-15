import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

interface Announcement {
  id: string
  message: string
  event_date?: string
  expires_at?: string
  status: 'draft' | 'published'
  created_at: string
}

function playSyntheticChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, start)
      gain.gain.setValueAtTime(0.15, start)
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(start)
      osc.stop(start + duration)
    }
    playTone(523.25, ctx.currentTime, 0.4) // C5
    playTone(659.25, ctx.currentTime + 0.12, 0.4) // E5
  } catch {}
}

export default function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const [countdownText, setCountdownText] = useState('')

  useEffect(() => {
    loadLatestAnnouncement()

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`fv-announcements-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcements' },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setAnnouncement(null)
          } else {
            const row = payload.new as Announcement
            if (row.status === 'published') {
              const now = new Date()
              const isExpired = row.expires_at && new Date(row.expires_at) <= now
              if (!isExpired) {
                setAnnouncement(row)
                playSyntheticChime()
              } else {
                setAnnouncement(null)
              }
            } else {
              setAnnouncement(null)
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Timer loop for countdown
  useEffect(() => {
    if (!announcement || !announcement.event_date) {
      setCountdownText('')
      return
    }

    const interval = setInterval(() => {
      const diff = new Date(announcement.event_date!).getTime() - Date.now()
      if (diff <= 0) {
        setCountdownText('Event Active / Ended')
        clearInterval(interval)
        return
      }

      const days = Math.floor(diff / 86400000)
      const hours = Math.floor((diff % 86400000) / 3600000)
      const minutes = Math.floor((diff % 3600000) / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)

      setCountdownText(
        `${days}d ${hours}h ${minutes}m ${seconds}s`
      )
    }, 1000)

    return () => clearInterval(interval)
  }, [announcement])

  async function loadLatestAnnouncement() {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false })

      if (!error && data) {
        const now = new Date()
        const active = data.find(r => !r.expires_at || new Date(r.expires_at) > now)
        setAnnouncement(active || null)
      }
    } catch (e) {
      console.error(e)
    }
  }

  if (!announcement) return null

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 animate-[fadeInDown_0.4s_ease-out]">
      <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-r from-blue-500/10 via-violet-500/5 to-transparent p-4 shadow-lg backdrop-blur-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <span className="material-symbols-outlined shrink-0 text-2xl text-blue-400 animate-pulse">campaign</span>
            <div className="min-w-0">
              <span className="inline-block rounded-full bg-blue-500/20 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-blue-400 mb-1">
                Announcement
              </span>
              <p className="text-sm font-semibold text-slate-200 leading-relaxed">
                {announcement.message}
              </p>
            </div>
          </div>

          {countdownText && (
            <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-amber-400 shrink-0 self-start sm:self-center">
              <span className="material-symbols-outlined text-[18px]">alarm</span>
              <div className="text-left">
                <p className="text-[9px] font-bold uppercase tracking-wider text-amber-500/60 leading-none">Time Remaining</p>
                <p className="text-xs font-black font-mono mt-0.5 leading-none">{countdownText}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
