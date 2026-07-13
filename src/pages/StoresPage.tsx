import { useEffect, useState } from 'react'
import { api, ApiError } from '../lib/api'
import ReservationModal from '../components/ReservationModal'
import type { AdminStore } from '../components/StoreForm'

interface StoresPageProps {
  onBack: () => void
  onViewReservations: () => void
}

export default function StoresPage({ onBack, onViewReservations }: StoresPageProps) {
  const [stores, setStores] = useState<AdminStore[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reservingStore, setReservingStore] = useState<AdminStore | null>(null)

  useEffect(() => {
    api
      .get<{ data: AdminStore[] }>('/api/stores')
      .then((res) => setStores(res.data))
      .catch((err) => setError(err instanceof ApiError ? err.message : '店舗一覧の取得に失敗しました'))
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button type="button" onClick={onBack} className="text-sm text-indigo-600 hover:underline">
            ← ダッシュボードに戻る
          </button>
          <h1 className="text-xl font-bold text-gray-900">店舗一覧</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>
        )}

        {isLoading ? (
          <p className="text-gray-500 text-sm">読み込み中...</p>
        ) : stores.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">店舗がありません</div>
        ) : (
          <ul className="space-y-3">
            {stores.map((store) => (
              <li key={store.id} className="bg-white rounded-lg shadow p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-900">{store.name}</p>
                  <p className="text-xs text-gray-500">
                    {store.category}
                    {store.open_time && store.close_time && ` ・ ${store.open_time} - ${store.close_time}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setReservingStore(store)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
                >
                  座席予約
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>

      {reservingStore && (
        <ReservationModal
          isOpen
          onClose={() => setReservingStore(null)}
          storeId={reservingStore.id}
          storeName={reservingStore.name}
          openTime={reservingStore.open_time}
          closeTime={reservingStore.close_time}
          onViewReservations={onViewReservations}
        />
      )}
    </div>
  )
}
