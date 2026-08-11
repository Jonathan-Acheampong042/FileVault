import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { UserProfile } from '../types'

interface AuthContextValue {
  session: Session | null
  profile: UserProfile | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function profileFromSession(session: Session | null): UserProfile | null {
  if (!session?.user) return null
  const meta = session.user.user_metadata ?? {}
  const email = session.user.email ?? ''
  return {
    id: session.user.id,
    email,
    displayName: meta.display_name || meta.full_name || meta.name || email.split('@')[0] || 'Student',
    avatarUrl: meta.avatar_url || meta.picture || meta.photo_url || null,
    emailVerified: !!session.user.email_confirmed_at,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const value: AuthContextValue = {
    session,
    profile: profileFromSession(session),
    loading,
    signOut: async () => {
      await supabase.auth.signOut()
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
