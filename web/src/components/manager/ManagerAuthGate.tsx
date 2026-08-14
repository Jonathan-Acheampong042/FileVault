import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

const ADMIN_EMAIL_ALLOWLIST = ['jacheampong042@gmail.com', 'admin@filevault.works']

interface ManagerAuthGateProps {
  children: React.ReactNode
}

export default function ManagerAuthGate({ children }: ManagerAuthGateProps) {
  const { session, profile, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const showToast = useToast()
  
  const [authorized, setAuthorized] = useState<boolean>(false)
  const [checking, setChecking] = useState<boolean>(true)

  useEffect(() => {
    async function checkAccess() {
      if (authLoading) return
      
      if (!session) {
        navigate('/login')
        return
      }

      try {
        // 1. MFA Check (AAL2)
        const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
        if (aalError) throw aalError
        
        if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
          showToast('Additional authentication required.', 'error')
          await supabase.auth.signOut()
          navigate('/login')
          return
        }

        // 2. Role Check
        let fetchedRole = profile?.role
        if (!fetchedRole) {
          const { data: profileData } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()
          fetchedRole = profileData?.role
        }

        const isAdmin = fetchedRole === 'admin' || 
                        fetchedRole === 'manager' || 
                        (session.user.email && ADMIN_EMAIL_ALLOWLIST.includes(session.user.email))
        
        if (!isAdmin) {
          showToast('Access denied: Manager privileges required.', 'error')
          navigate('/')
          return
        }

        setAuthorized(true)
      } catch (err) {
        console.error('Authorization error:', err)
        navigate('/')
      } finally {
        setChecking(false)
      }
    }

    checkAccess()
  }, [session, profile, authLoading, navigate, showToast])

  if (checking || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500/20 border-t-blue-500" />
      </div>
    )
  }

  if (!authorized) {
    return null
  }

  return <>{children}</>
}
