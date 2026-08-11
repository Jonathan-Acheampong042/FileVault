import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!url || !anonKey) {
  // Fails loudly in dev rather than silently returning a broken client.
  // eslint-disable-next-line no-console
  console.warn(
    '[FileVault] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set. ' +
      'Copy .env.example to .env.local and fill in your project credentials.'
  )
}

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: window.localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export const API_BASE =
  (import.meta.env.VITE_API_BASE as string) || 'http://localhost:3000'
