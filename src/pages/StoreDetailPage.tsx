import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { getStoreLikeCount } from '../lib/likes'
import { useApiQuery } from '../hooks/useApiQuery'
import LikeButton from '../components/LikeButton'
import StoreReviewSection from '../components/StoreReviewSection'
import ReservationModal from '../components/ReservationModal'
import { PageHeader } from '../components/ui/PageHeader'
import { LoadingText } from '../components/ui/LoadingText'
import type { AdminStore } from '../components/StoreForm'
import Cloud from '../components/decor/Cloud'
import Leaf from '../components/decor/Leaf'

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
  const [isReserving, setIsReserving] = useState(false)

  const { data, isLoading, error } = useApiQuery(
    async () => {
      const [storeData, likeResult] = await Promise.all([
        api.get<AdminStore>(`/api/stores/${storeId}`),
        getStoreLikeCount(storeId!),
      ])
      return { store: storeData, likeCount: likeResult.count }
    },
    [storeId],
    { enabled: !!storeId, fallbackMessage: '店舗情報の取得に失敗しました' }
  )
  const store = data?.store ?? null
  const likeCount = data?.likeCount ?? 0

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
        <LoadingText />
      </div>
    )
  }

  if (error || !store) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
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
    <>
      <PageHeader
        title="店舗詳細"
        backTo="/stores"
        backLabel="← 店舗一覧に戻る"
        backVariant="ghost"
        decor={<Cloud className="absolute right-6 top-2 h-8 w-16 opacity-30" />}
      />

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
    </>
  )
}
