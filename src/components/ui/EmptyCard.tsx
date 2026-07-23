import type { ReactNode } from 'react'

interface EmptyCardProps {
  message: ReactNode
  decor?: ReactNode
  // 'card': ac-card スタイル（StoresPage/ReservationsListPage/LikesListPage）
  // 'dashed': 破線ボーダーのプレースホルダースタイル（StoreManagementPanel/StoreMediaPanel）
  variant?: 'card' | 'dashed'
}

// 複数画面に重複していた「データ0件時のプレースホルダー」を集約する（Issue #107）。
export function EmptyCard({ message, decor, variant = 'card' }: EmptyCardProps) {
  if (variant === 'dashed') {
    return (
      <div className="rounded-2xl border-2 border-dashed border-wood-200 bg-sand-50/60 px-4 py-6 text-center text-sm text-wood-400">
        {message}
      </div>
    )
  }

  return (
    <div className={`ac-card text-center text-wood-500 ${decor ? 'relative' : ''}`}>
      {decor}
      {message}
    </div>
  )
}
