import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ManagerSettingsProvider } from '../context/ManagerSettingsContext'
import ManagerAuthGate from '../components/manager/ManagerAuthGate'
import ManagerDashboard from '../components/manager/ManagerDashboard'
import ManagerFileGrid from '../components/manager/ManagerFileGrid'
import ManagerUploadRequests from '../components/manager/ManagerUploadRequests'
import ProfileHeader from '../components/profile/ProfileHeader'
import { useAuth } from '../context/AuthContext'

type ManagerTab = 'dashboard' | 'files' | 'requests'

function ManagerContent() {
  const [activeTab, setActiveTab] = useState<ManagerTab>('dashboard')
  const { session } = useAuth()

  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 px-4 py-3 backdrop-blur-xl sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:border-blue-500/30 hover:bg-blue-500/20 hover:text-blue-500 transition-colors">
            <span className="material-symbols-outlined text-[18px]">home</span>
          </Link>
          <div className="h-9 w-9 overflow-hidden rounded-xl bg-white/5">
            <img src="/filevault-logo.png" alt="FileVault" className="h-full w-full object-contain" />
          </div>
          <div>
            <h1 className="text-[14px] font-bold text-white">Manager Portal</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {session && <ProfileHeader compact />}
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-white/5 px-4 sm:px-6">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-3 text-[13px] font-bold border-b-2 transition-colors ${
              activeTab === 'dashboard' 
                ? 'border-blue-500 text-blue-400' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`py-3 text-[13px] font-bold border-b-2 transition-colors ${
              activeTab === 'files' 
                ? 'border-blue-500 text-blue-400' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Manage Files
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`py-3 text-[13px] font-bold border-b-2 transition-colors ${
              activeTab === 'requests' 
                ? 'border-blue-500 text-blue-400' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Upload Requests
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6">
        <div className="mx-auto max-w-7xl animate-[fadeInUp_0.4s_ease-out_both]">
          {activeTab === 'dashboard' && <ManagerDashboard />}
          {activeTab === 'files' && <ManagerFileGrid />}
          {activeTab === 'requests' && <ManagerUploadRequests />}
        </div>
      </main>
    </div>
  )
}

export default function ManagerPage() {
  return (
    <ManagerSettingsProvider>
      <ManagerAuthGate>
        <ManagerContent />
      </ManagerAuthGate>
    </ManagerSettingsProvider>
  )
}
