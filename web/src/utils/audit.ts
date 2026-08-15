import { supabase } from '../lib/supabase'

export async function logAudit(action: 'upload' | 'delete' | 'edit', fileName: string | null, folderName: string | null, meta?: any) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const actor = session && session.user ? (session.user.email || 'manager') : 'manager'
    
    await supabase.from('audit_log').insert([{
      action,
      file_name: fileName || null,
      folder_name: folderName || null,
      actor,
      meta: meta || null
    }])
  } catch (e: any) {
    console.warn('Audit log failed:', e.message)
  }
}
