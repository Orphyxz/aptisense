import { createContext, useContext } from 'react'

type ToastTone = 'success' | 'error' | 'info'

export type ToastInput = {
  title: string
  message?: string
  tone: ToastTone
}

export type ToastContextType = {
  showToast: (toast: ToastInput) => void
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}
