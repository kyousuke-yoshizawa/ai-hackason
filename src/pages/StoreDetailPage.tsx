import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api, ApiError } from '../lib/api'
import { getStoreLikeCount } from '../lib/likes'
import LikeButton from '../components/LikeButton'
import StoreReviewSection from '../components/StoreReviewSection'
import ReservationModal from '../components/ReservationModal'
import type { AdminStore } from '../components/StoreForm'

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
    return <p className="p-8 text-center text-gray-500 text-sm">読み込み中...</p>
  }

  if (error || !store) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-sm mb-4">{error ?? '店舗が見つかりません'}</p>
          <button
            type="button"
            onClick={() => navigate('/stores')}
            className="text-sm text-indigo-600 hover:underline"
          >
            ← 店舗一覧に戻る
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/stores')}
            className="text-sm text-indigo-600 hover:underline"
          >
            ← 店舗一覧に戻る
          </button>
          <h1 className="text-xl font-bold text-gray-900">店舗詳細</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{store.name}</h2>
              <p className="text-sm text-gray-500 mt-1">
                {store.category}
                {store.open_time && store.close_time && ` ・ ${store.open_time} - ${store.close_time}`}
              </p>
            </div>
            {user && <LikeButton userId={user.id} storeId={store.id} initialCount={likeCount} />}
          </div>

          <button
            type="button"
            onClick={() => setIsReserving(true)}
            className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
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
