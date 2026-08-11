import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type Theme = 'light' | 'dark'
type FontSize = 'small' | 'medium' | 'large'

interface AccentColor {
  color: string
  light: string
  border: string
}

interface ManagerSettingsContextType {
  theme: Theme
  toggleTheme: () => void
  highContrast: boolean
  toggleHighContrast: () => void
  fontSize: FontSize
  setFontSize: (size: FontSize) => void
  accent: AccentColor
  setAccent: (accent: AccentColor) => void
  compactView: boolean
  toggleCompactView: () => void
  settingsOpen: boolean
  setSettingsOpen: (open: boolean) => void
  toggleSettings: () => void
}

const ManagerSettingsContext = createContext<ManagerSettingsContextType | undefined>(undefined)

const DEFAULT_ACCENT: AccentColor = {
  color: '#3b82f6',
  light: 'rgba(59, 130, 246, 0.2)',
  border: 'rgba(59, 130, 246, 0.4)'
}

export function ManagerSettingsProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')
  const [highContrast, setHighContrastState] = useState(false)
  const [fontSize, setFontSizeState] = useState<FontSize>('medium')
  const [accent, setAccentState] = useState<AccentColor>(DEFAULT_ACCENT)
  const [compactView, setCompactViewState] = useState(false)
  
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    // Load saved settings
    const savedTheme = localStorage.getItem('fvMgrTheme') as Theme | null
    if (savedTheme) setThemeState(savedTheme)
    else if (window.matchMedia('(prefers-color-scheme: dark)').matches === false) {
      setThemeState('light')
    }

    if (localStorage.getItem('fvMgrHighContrast') === '1') setHighContrastState(true)
    
    const savedFs = localStorage.getItem('fvMgrFontSize') as FontSize | null
    if (savedFs) setFontSizeState(savedFs)

    try {
      const savedAccent = JSON.parse(localStorage.getItem('fvMgrAccent') || 'null')
      if (savedAccent) setAccentState(savedAccent)
    } catch (e) {}

    if (localStorage.getItem('fvMgrCompactView') === '1') setCompactViewState(true)
    
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted) return
    const root = document.documentElement
    
    // Apply Theme
    if (theme === 'light') root.classList.add('light')
    else root.classList.remove('light')
    
    // Apply Contrast
    if (highContrast) root.classList.add('high-contrast')
    else root.classList.remove('high-contrast')

    // Apply Font Size
    root.classList.remove('fs-small', 'fs-medium', 'fs-large')
    root.classList.add(`fs-${fontSize}`)

    // Apply Accent
    root.style.setProperty('--accent', accent.color)
    root.style.setProperty('--accent-light', accent.light)
    root.style.setProperty('--accent-border', accent.border)

  }, [theme, highContrast, fontSize, accent, isMounted])

  const toggleTheme = () => {
    setThemeState(prev => {
      const next = prev === 'light' ? 'dark' : 'light'
      localStorage.setItem('fvMgrTheme', next)
      return next
    })
  }

  const toggleHighContrast = () => {
    setHighContrastState(prev => {
      const next = !prev
      localStorage.setItem('fvMgrHighContrast', next ? '1' : '0')
      return next
    })
  }

  const setFontSize = (size: FontSize) => {
    setFontSizeState(size)
    localStorage.setItem('fvMgrFontSize', size)
  }

  const setAccent = (newAccent: AccentColor) => {
    setAccentState(newAccent)
    localStorage.setItem('fvMgrAccent', JSON.stringify(newAccent))
  }

  const toggleCompactView = () => {
    setCompactViewState(prev => {
      const next = !prev
      localStorage.setItem('fvMgrCompactView', next ? '1' : '0')
      return next
    })
  }

  const toggleSettings = () => setSettingsOpen(prev => !prev)

  return (
    <ManagerSettingsContext.Provider
      value={{
        theme, toggleTheme,
        highContrast, toggleHighContrast,
        fontSize, setFontSize,
        accent, setAccent,
        compactView, toggleCompactView,
        settingsOpen, setSettingsOpen, toggleSettings
      }}
    >
      {children}
    </ManagerSettingsContext.Provider>
  )
}

export function useManagerSettings() {
  const context = useContext(ManagerSettingsContext)
  if (context === undefined) {
    throw new Error('useManagerSettings must be used within a ManagerSettingsProvider')
  }
  return context
}
