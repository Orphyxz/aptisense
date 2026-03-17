import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { ToastContext, type ToastInput } from './toast-context'

type ToastItem = {
  id: number
} & ToastInput

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback((toast: ToastInput) => {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    setToasts((current) => [...current, { ...toast, id }])

    window.setTimeout(() => {
      dismissToast(id)
    }, 3200)
  }, [dismissToast])

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.tone}`}>
            <div className="toast-copy">
              <div className="toast-title">{toast.title}</div>
              {toast.message ? <div className="toast-message">{toast.message}</div> : null}
            </div>
            <button className="toast-close" onClick={() => dismissToast(toast.id)} aria-label="Dismiss notification">
              x
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
