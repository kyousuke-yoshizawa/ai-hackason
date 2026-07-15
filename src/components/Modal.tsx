import { ReactNode } from 'react'
import Leaf from './decor/Leaf'

export function Modal({
  title,
  onClose,
  children,
  maxWidth = 'max-w-md',
}: {
  title: string
  onClose: () => void
  children: ReactNode
  maxWidth?: string
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-wood-900/50 px-4">
      <div className={`ac-card relative w-full ${maxWidth} max-h-[90vh] overflow-y-auto`}>
        <Leaf className="absolute -top-4 -left-4 h-9 w-9 rotate-[-15deg] drop-shadow" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-wood-800">{title}</h2>
          <button
            onClick={onClose}
            className="ac-btn-ghost !px-2 !py-1 text-wood-400 hover:text-wood-700"
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
