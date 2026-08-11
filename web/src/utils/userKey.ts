const USER_KEY_STORAGE = 'fvUserKey'

/**
 * A random, login-independent identifier stored in localStorage.
 * Lets anonymous students like/react/comment without an account,
 * exactly like the original vanilla-JS app's _getUserKey().
 */
export function getUserKey(): string {
  let key = localStorage.getItem(USER_KEY_STORAGE)
  if (!key) {
    key = `u_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
    localStorage.setItem(USER_KEY_STORAGE, key)
  }
  return key
}
