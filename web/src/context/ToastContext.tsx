import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'info' | 'warning'
interface Toast {
  id: number
  message: string
  type: ToastType
}

const ICONS: Record<ToastType, string> = {
  success: 'check_circle',
  error: 'error',
  info: 'info',
  warning: 'warning',
}

const ToastContext = createContext<((message: string, type?: ToastType, duration?: number) => void) | undefined>(
  undefined
)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  let nextId = 0

  const showToast = useCallback((message: string, type: ToastType = 'info', duration = 3000) => {
    const id = nextId++
    setToasts((t) => [...t, { id, message, type }])
    setTimeout(() => {
      setToasts((t) => t.filter((toast) => toast.id !== id))
    }, duration)
  }, [])

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2.5 min-w-[240px] max-w-[320px] rounded-2xl border px-4 py-3 text-[13px] font-semibold text-white shadow-lg backdrop-blur-xl animate-[toastIn_.3s_ease] ${
              {
                success: 'bg-emerald-500/20 border-emerald-400/30',
                error: 'bg-red-500/20 border-red-400/30',
                info: 'bg-blue-500/20 border-blue-400/30',
                warning: 'bg-amber-500/20 border-amber-400/30',
              }[t.type]
            }`}
          >
            <span className="material-symbols-outlined text-[18px] shrink-0">{ICONS[t.type]}</span>
            <span className="flex-1">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
