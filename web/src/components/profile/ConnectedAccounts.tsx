import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'
import type { UserIdentity } from '@supabase/supabase-js'

export default function ConnectedAccounts() {
  const showToast = useToast()
  const [loading, setLoading] = useState(true)
  const [identities, setIdentities] = useState<UserIdentity[]>([])

  useEffect(() => {
    loadAccounts()
  }, [])

  async function loadAccounts() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user && user.identities) {
      setIdentities(user.identities)
    }
    setLoading(false)
  }

  async function linkAccount(provider: 'google' | 'discord' | 'github') {
    const { error } = await supabase.auth.linkIdentity({ provider })
    if (error) {
      showToast(error.message, 'error')
    } else {
      showToast(`Redirecting to link ${provider}...`, 'info')
    }
  }

  async function unlinkAccount(identity: UserIdentity) {
    if (identities.length <= 1) {
      showToast('You must have at least one connected account or email.', 'error')
      return
    }
    
    if (!confirm(`Unlink ${identity.provider} account?`)) return

    const { error } = await supabase.auth.unlinkIdentity(identity)
    if (error) {
      showToast(error.message, 'error')
    } else {
      showToast('Account unlinked', 'success')
      loadAccounts()
    }
  }

  const providers = [
    { id: 'google', name: 'Google', icon: 'google.svg', color: '#ea4335' },
    { id: 'discord', name: 'Discord', icon: 'discord.svg', color: '#5865F2' },
    { id: 'github', name: 'GitHub', icon: 'github-mark-white.svg', color: '#ffffff' }
  ] as const

  return (
    <div className="section-card border border-white/5 bg-white/[0.03] p-5 rounded-[1.1rem]">
      <div className="mb-3.5 flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-wider text-slate-100">
        <span className="material-symbols-outlined text-[18px] text-blue-400">link</span>
        Connected Accounts
      </div>
      
      <div className="space-y-2">
        {loading ? (
          <p className="py-2 text-center text-xs text-slate-500">Loading...</p>
        ) : (
          providers.map(p => {
            const connectedIdentity = identities.find(i => i.provider === p.id)
            
            return (
              <div key={p.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3 transition-colors hover:bg-white/[0.04]">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 p-2">
                    <img src={`/${p.icon}`} alt={p.name} className="h-full w-full object-contain" />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-slate-200">{p.name}</p>
                    {connectedIdentity ? (
                      <p className="text-[11px] text-slate-400">
                        {connectedIdentity.identity_data?.email || connectedIdentity.identity_data?.custom_claims?.global_name || 'Connected'}
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-500">Not connected</p>
                    )}
                  </div>
                </div>
                
                {connectedIdentity ? (
                  <button
                    onClick={() => unlinkAccount(connectedIdentity)}
                    className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[11px] font-bold text-red-400 transition-colors hover:bg-red-500/20"
                  >
                    Unlink
                  </button>
                ) : (
                  <button
                    onClick={() => linkAccount(p.id)}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-slate-300 transition-colors hover:bg-white/10"
                  >
                    Link
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
