import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { ThemeSettings } from '../types'

const DEFAULT_ACCENT = { color: '#3b82f6', light: 'rgba(59,130,246,0.2)', border: 'rgba(59,130,246,0.4)' }

const LS_KEYS = {
  theme: 'fvTheme',
  highContrast: 'fvHighContrast',
  fontSize: 'fvFontSize',
  accent: 'fvAccent',
  compactView: 'fvCompactView',
} as const

function readInitial(): ThemeSettings {
  const savedTheme = localStorage.getItem(LS_KEYS.theme)
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const theme: ThemeSettings['theme'] = savedTheme ? (savedTheme as 'dark' | 'light') : prefersDark ? 'dark' : 'light'
  const highContrast = localStorage.getItem(LS_KEYS.highContrast) === '1'
  const fontSize = (localStorage.getItem(LS_KEYS.fontSize) as ThemeSettings['fontSize']) || 'medium'
  const compactView = localStorage.getItem(LS_KEYS.compactView) === '1'
  let accent = DEFAULT_ACCENT
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEYS.accent) || 'null')
    if (saved) accent = saved
  } catch {
    /* ignore parse errors, use default */
  }
  return { theme, highContrast, fontSize, accent, compactView }
}

interface SettingsContextValue extends ThemeSettings {
  toggleTheme: () => void
  toggleHighContrast: () => void
  setFontSize: (size: ThemeSettings['fontSize']) => void
  setAccent: (accent: ThemeSettings['accent']) => void
  toggleCompactView: () => void
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ThemeSettings>(readInitial)

  // Apply to <html> classList + CSS vars whenever settings change
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('light', settings.theme === 'light')
    root.classList.toggle('high-contrast', settings.highContrast)
    root.classList.remove('fs-small', 'fs-medium', 'fs-large')
    root.classList.add(`fs-${settings.fontSize}`)
    root.style.setProperty('--accent', settings.accent.color)
    root.style.setProperty('--accent-light', settings.accent.light)
    root.style.setProperty('--accent-border', settings.accent.border)
    document.body.classList.toggle('compact-view', settings.compactView)
  }, [settings])

  const value: SettingsContextValue = {
    ...settings,
    toggleTheme: () =>
      setSettings((s) => {
        const theme = s.theme === 'light' ? 'dark' : 'light'
        localStorage.setItem(LS_KEYS.theme, theme)
        return { ...s, theme }
      }),
    toggleHighContrast: () =>
      setSettings((s) => {
        const highContrast = !s.highContrast
        localStorage.setItem(LS_KEYS.highContrast, highContrast ? '1' : '0')
        return { ...s, highContrast }
      }),
    setFontSize: (fontSize) =>
      setSettings((s) => {
        localStorage.setItem(LS_KEYS.fontSize, fontSize)
        return { ...s, fontSize }
      }),
    setAccent: (accent) =>
      setSettings((s) => {
        localStorage.setItem(LS_KEYS.accent, JSON.stringify(accent))
        return { ...s, accent }
      }),
    toggleCompactView: () =>
      setSettings((s) => {
        const compactView = !s.compactView
        localStorage.setItem(LS_KEYS.compactView, compactView ? '1' : '0')
        return { ...s, compactView }
      }),
  }

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}

export const ACCENT_SWATCHES = [
  { color: '#3b82f6', light: 'rgba(59,130,246,0.2)', border: 'rgba(59,130,246,0.4)', label: 'Blue' },
  { color: '#8b5cf6', light: 'rgba(139,92,246,0.2)', border: 'rgba(139,92,246,0.4)', label: 'Purple' },
  { color: '#10b981', light: 'rgba(16,185,129,0.2)', border: 'rgba(16,185,129,0.4)', label: 'Green' },
  { color: '#f59e0b', light: 'rgba(245,158,11,0.2)', border: 'rgba(245,158,11,0.4)', label: 'Amber' },
  { color: '#ef4444', light: 'rgba(239,68,68,0.2)', border: 'rgba(239,68,68,0.4)', label: 'Red' },
  { color: '#06b6d4', light: 'rgba(6,182,212,0.2)', border: 'rgba(6,182,212,0.4)', label: 'Cyan' },
]
