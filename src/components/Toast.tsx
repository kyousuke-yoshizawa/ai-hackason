import { useCallback, useState } from 'react'

interface ToastState {
  message: string
  type: 'success' | 'error'
}

// eslint-disable-next-line react-refresh/only-export-components -- useToast の分離は T14 (feature-first 再構成) で対応
export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null)

  const showToast = useCallback((message: string, type: ToastState['type'] = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  return { toast, showToast }
}

export function ToastContainer({ toast }: { toast: ToastState | null }) {
  if (!toast) return null

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 rounded-2xl border-2 px-4 py-3 text-sm font-bold text-white shadow-ac transition ${
        toast.type === 'success'
          ? 'border-leaf-700/30 bg-leaf-500'
          : 'border-bubble-700/30 bg-bubble-500'
      }`}
    >
      {toast.type === 'success' ? '🍃 ' : '⚠️ '}
      {toast.message}
    </div>
  )
}
