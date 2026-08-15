/**
 * Simple wrapper for HTML5 Vibration API to provide haptic feedback on mobile devices.
 */
export function haptic(type: 'light' | 'success') {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      if (type === 'light') {
        navigator.vibrate(10)
      } else if (type === 'success') {
        navigator.vibrate([15, 50, 15])
      }
    } catch (e) {
      console.warn('Haptic feedback failed:', e)
    }
  }
}
