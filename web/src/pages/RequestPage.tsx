import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSettings } from '../context/SettingsContext'
import ProfileHeader from '../components/profile/ProfileHeader'
import RequestAuthGate from '../components/request/RequestAuthGate'
import RequestForm from '../components/request/RequestForm'
import RequestSuccessState from '../components/request/RequestSuccessState'
import RequestHistory from '../components/request/RequestHistory'

export default function RequestPage() {
  const { session, user } = useAuth()
  const { toggleSettings } = useSettings()
  const [searchParams, setSearchParams] = useSearchParams()
  
  // Read initial data from URL
  const initialFilename = searchParams.get('filename') || ''
  const initialFolder = searchParams.get('folder') || ''
  const reqIdFromUrl = searchParams.get('req') || ''

  const [activeReqId, setActiveReqId] = useState<string | null>(reqIdFromUrl || null)

  useEffect(() => {
    // Sync hash or search params for #req= or ?req=
    const hashMatch = window.location.hash.match(/[#&]req=([^&]+)/)
    if (hashMatch) {
      setActiveReqId(hashMatch[1])
    }
  }, [])

  function handleSuccess(id: string) {
    setActiveReqId(id)
    setSearchParams({ req: id })
  }

  return (
    <div className="flex min-h-screen items-start justify-center px-4 pb-16 pt-[max(48px,calc(env(safe-area-inset-top)+24px))]">
      <div className="w-full max-w-lg animate-[fadeInUp_0.45s_ease-out_both]">
        
        {/* Page Header */}
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 transition-colors hover:text-blue-300">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to Vault
          </Link>
          
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSettings}
              title="Display settings"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition-colors hover:border-blue-500/30 hover:bg-blue-500/20 hover:text-blue-500"
            >
              <span className="material-symbols-outlined text-[18px]">palette</span>
            </button>
            {session && <ProfileHeader compact />}
          </div>
        </div>

        {/* Main Card */}
        <div className="glass-card rounded-[24px] p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-4">
            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-white/5">
              <img src="/filevault-logo.png" alt="FileVault" className="h-full w-full object-contain" />
            </div>
            <div>
              <h1 className="m-0 text-xl font-extrabold leading-snug text-white">Request a File</h1>
              <p className="m-0 mt-0.5 text-xs text-slate-500">Tell us what material you need — we'll upload it.</p>
            </div>
          </div>

          {!session ? (
            <RequestAuthGate />
          ) : activeReqId ? (
            <RequestSuccessState requestId={activeReqId} />
          ) : (
            <RequestForm 
              email={user?.email || ''} 
              onSubmitSuccess={handleSuccess}
              initialData={{ filename: initialFilename, folder: initialFolder }}
            />
          )}

          {/* History Section */}
          {session && (
            <RequestHistory 
              email={user?.email || ''}
              onSelectRequest={handleSuccess}
            />
          )}

          <p className="mt-5 text-center text-[11px] text-white/15">
            Requests are reviewed by the manager. This is not a guaranteed upload.
          </p>

          <p className="mt-5 animate-[fadeIn_0.5s_ease] text-center text-xs text-slate-700">
            FileVault · Built by <span className="font-semibold text-slate-600">Jonathan Acheampong</span>
          </p>
        </div>
      </div>
    </div>
  )
}
