import { supabase } from '../lib/supabase'

/** Maps raw Supabase/internal error strings to user-friendly copy. */
export function friendlyError(err: unknown): string {
  if (!err) return 'Something went wrong. Please try again.'
  const msg = ((err as { message?: string }).message || String(err)).toLowerCase()
  console.error('[FileVault Auth] Raw error:', err)

  if (msg.includes('invalid login') || msg.includes('invalid credentials'))
    return 'Incorrect email or password. Please try again.'
  if (msg.includes('user not found'))
    return 'No account found with that email address.'
  if (msg.includes('email not confirmed'))
    return "Your email hasn't been verified yet. Check your inbox for a confirmation link."
  if (msg.includes('user already registered') || msg.includes('already exists'))
    return 'An account with this email already exists. Try signing in instead.'
  if (msg.includes('password') && msg.includes('weak'))
    return 'Password is too weak. Please choose a stronger password.'
  if (msg.includes('different from the old password') || msg.includes('should be different from the old'))
    return 'Your new password must be different from your current password. Please choose a different one.'
  if (msg.includes('auth session missing') || msg.includes('session missing') || msg.includes('session not found'))
    return 'Your session has expired. Please request a new password reset link and try again.'
  if (msg.includes('rate limit') || msg.includes('too many requests') || msg.includes('email rate limit'))
    return 'Too many attempts. Please wait a moment before trying again.'
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch'))
    return 'Network error. Please check your connection and try again.'
  if (
    msg.includes('otp') || msg.includes('email link') || msg.includes('one-time password') ||
    msg.includes('invalid_otp') || msg.includes('token has expired') ||
    msg.includes('token not found') || msg.includes('invalid token') ||
    msg.includes('magic link') || msg.includes('link is invalid') ||
    msg.includes('link has expired') || msg.includes('invalid_grant')
  )
    return 'The code or link has expired or is invalid. Please request a new one.'
  if (msg.includes('captcha') || msg.includes('hcaptcha') || msg.includes('unexpected_failure'))
    return 'Verification failed. Please try again.'

  return 'Something went wrong. Please try again or contact support if the problem persists.'
}

/** Simple email format validator. */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
}

/** Password strength rules and scoring. */
export interface PwdStrength {
  rules: Record<string, boolean>
  score: number
  label: string
  level: 'weak' | 'fair' | 'good' | 'strong' | ''
}

export function checkPwdStrength(pwd: string): PwdStrength {
  const rules: Record<string, boolean> = {
    len: pwd.length >= 8,
    upper: /[A-Z]/.test(pwd),
    lower: /[a-z]/.test(pwd),
    num: /[0-9]/.test(pwd),
    special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(pwd),
  }
  const score = Object.values(rules).filter(Boolean).length
  const levels: Array<PwdStrength['level']> = ['', 'weak', 'fair', 'good', 'strong']
  const names = ['', 'Too weak', 'Fair', 'Good', 'Strong ✓']
  return {
    rules,
    score,
    label: pwd.length === 0 ? '' : names[Math.min(score, 4)] || 'Too short',
    level: pwd.length === 0 ? '' : levels[Math.min(score, 4)],
  }
}

/** Allowed pages for ?next= redirect after login. */
const ALLOWED_NEXT_PAGES = ['/', '/login', '/profile', '/manager', '/request']

export function sanitizeNextPage(raw: string | null): string | null {
  if (!raw) return null
  const name = raw.split('?')[0].split('#')[0]
  return ALLOWED_NEXT_PAGES.includes(name) ? name : null
}

/**
 * Check if the current session needs MFA challenge.
 * Returns { needed, factorId, challengeId } or { needed: false }.
 */
export async function checkMfaRequired(): Promise<{
  needed: boolean
  factorId?: string
  challengeId?: string
}> {
  const { data: factors, error: factorsErr } = await supabase.auth.mfa.listFactors()
  if (factorsErr) {
    console.warn('[MFA] listFactors error:', factorsErr.message)
    return { needed: false }
  }
  const totp = (factors?.totp || []).find((f) => f.status === 'verified')
  if (!totp) return { needed: false }

  const { data: aal } = await supabase.auth.mfa
    .getAuthenticatorAssuranceLevel()
    .catch(() => ({ data: null }))

  const needsUpgrade = aal && aal.currentLevel !== 'aal2'
  const shouldChallenge =
    (totp && needsUpgrade) ||
    (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2')

  if (!shouldChallenge) return { needed: false }

  const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({
    factorId: totp.id,
  })
  if (chErr) return { needed: false }

  return { needed: true, factorId: totp.id, challengeId: challenge.id }
}
