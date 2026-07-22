import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api, ApiError } from '../lib/api'
import { getStoreLikeCount } from '../lib/likes'
import LikeButton from '../components/LikeButton'
import StoreReviewSection from '../components/StoreReviewSection'
import ReservationModal from '../components/ReservationModal'
import type { AdminStore } from '../components/StoreForm'
import Cloud from '../components/decor/Cloud'
import Leaf from '../components/decor/Leaf'
import GrassBorder from '../components/decor/GrassBorder'

// 0=日曜〜6=土曜（JSのDate.getDay()と同じ規約、Issue #127）
const DAY_NAMES = ['日曜', '月曜', '火曜', '水曜', '木曜', '金曜', '土曜']

function formatClosedDays(closedDays: number[]): string {
  return closedDays
    .filter((d) => d >= 0 && d <= 6)
    .map((d) => DAY_NAMES[d])
    .join('・')
}

export default function StoreDetailPage() {
  const { storeId } = useParams<{ storeId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [store, setStore] = useState<AdminStore | null>(null)
  const [likeCount, setLikeCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isReserving, setIsReserving] = useState(false)

  useEffect(() => {
    if (!storeId) return

    setIsLoading(true)
    setError(null)
    Promise.all([api.get<AdminStore>(`/api/stores/${storeId}`), getStoreLikeCount(storeId)])
      .then(([storeData, likeResult]) => {
        setStore(storeData)
        setLikeCount(likeResult.count)
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : '店舗情報の取得に失敗しました'))
      .finally(() => setIsLoading(false))
  }, [storeId])

  if (isLoading) {
    return (
      <div className="ac-page-bg flex items-center justify-center">
        <p className="text-sm font-bold text-wood-500">読み込み中...</p>
      </div>
    )
  }

  if (error || !store) {
    return (
      <div className="ac-page-bg flex items-center justify-center">
        <div className="ac-card relative text-center">
          <Leaf className="absolute -top-6 -left-6 h-14 w-14 -rotate-12 drop-shadow" />
          <p className="mb-4 text-sm font-bold text-bubble-700">{error ?? '店舗が見つかりません'}</p>
          <button
            type="button"
            onClick={() => navigate('/stores')}
            className="ac-btn-secondary !px-4 !py-2 text-sm"
          >
            ← 店舗一覧に戻る
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="ac-page-bg">
      <header className="ac-header relative">
        <Cloud className="absolute right-6 top-2 h-8 w-16 opacity-30" />
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-4">
          <button
            type="button"
            onClick={() => navigate('/stores')}
            className="ac-btn-ghost !px-3 !py-1.5 text-sm !text-white hover:!bg-white/20"
          >
            ← 店舗一覧に戻る
          </button>
          <h1 className="text-xl font-extrabold">店舗詳細</h1>
        </div>
        <GrassBorder className="absolute -bottom-[5px] left-0 h-2 w-full" color="#eef9ff" />
      </header>

      <main className="relative mx-auto max-w-4xl space-y-6 px-4 py-8">
        <Leaf className="absolute -top-2 right-2 h-9 w-9 rotate-12 opacity-70" />

        <div className="ac-card">
          <div className="mb-2 flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-extrabold text-wood-800">{store.name}</h2>
              <p className="mt-1 text-sm text-wood-500">
                {store.category}
                {store.open_time && store.close_time && ` ・ ${store.open_time} - ${store.close_time}`}
                {store.last_order_time && `（L.O. ${store.last_order_time}）`}
              </p>
              {store.sub_area && (
                <p className="mt-1 text-sm text-wood-500">エリア: {store.sub_area}</p>
              )}
              {store.closed_days && store.closed_days.length > 0 && (
                <p className="mt-1 text-sm text-wood-500">
                  定休日: {formatClosedDays(store.closed_days)}
                </p>
              )}
            </div>
            {user && <LikeButton userId={user.id} storeId={store.id} initialCount={likeCount} />}
          </div>

          {store.description && (
            <p className="mt-3 whitespace-pre-wrap text-sm text-wood-600">{store.description}</p>
          )}

          {store.tags && store.tags.length > 0 && (
            <div className="mt-4">
              <h3 className="mb-1.5 text-sm font-bold text-wood-700">タグ</h3>
              <div className="flex flex-wrap gap-2">
                {store.tags.map((tag) => (
                  <span key={tag} className="ac-badge bg-leaf-100 text-leaf-700">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsReserving(true)}
            className="ac-btn-primary mt-4 !px-4 !py-2 text-sm"
          >
            座席予約
          </button>
        </div>

        <StoreReviewSection storeId={store.id} />
      </main>

      {isReserving && (
        <ReservationModal
          isOpen
          onClose={() => setIsReserving(false)}
          storeId={store.id}
          storeName={store.name}
          openTime={store.open_time}
          closeTime={store.close_time}
          onViewReservations={() => navigate('/reservations')}
        />
      )}
    </div>
  )
}
