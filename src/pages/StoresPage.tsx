import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api, ApiError } from '../lib/api'
import { getStoreLikeCount } from '../lib/likes'
import LikeButton from '../components/LikeButton'
import ReservationModal from '../components/ReservationModal'
import type { AdminStore } from '../components/StoreForm'

type SortKey = 'name' | 'category'

export default function StoresPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [stores, setStores] = useState<AdminStore[]>([])
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reservingStore, setReservingStore] = useState<AdminStore | null>(null)
  const [searchText, setSearchText] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortKey, setSortKey] = useState<SortKey>('name')

  useEffect(() => {
    api
      .get<{ data: AdminStore[] }>('/api/stores')
      .then(async (res) => {
        setStores(res.data)
        const counts = await Promise.all(res.data.map((store) => getStoreLikeCount(store.id)))
        setLikeCounts(Object.fromEntries(res.data.map((store, i) => [store.id, counts[i].count])))
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : '店舗一覧の取得に失敗しました'))
      .finally(() => setIsLoading(false))
  }, [])

  const categories = useMemo(() => Array.from(new Set(stores.map((s) => s.category))), [stores])

  const visibleStores = useMemo(() => {
    const text = searchText.trim().toLowerCase()
    const filtered = stores.filter((s) => {
      const matchesText = text === '' || s.name.toLowerCase().includes(text)
      const matchesCategory = categoryFilter === 'all' || s.category === categoryFilter
      return matchesText && matchesCategory
    })

    return [...filtered].sort((a, b) => {
      const primary = a[sortKey].localeCompare(b[sortKey], 'ja')
      if (primary !== 0) return primary
      return a.name.localeCompare(b.name, 'ja')
    })
  }, [stores, searchText, categoryFilter, sortKey])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="text-sm text-indigo-600 hover:underline"
          >
            ← ダッシュボードに戻る
          </button>
          <h1 className="text-xl font-bold text-gray-900">店舗一覧</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>
        )}

        <div className="flex flex-wrap gap-3 mb-6">
          <input
            type="text"
            placeholder="店舗名で検索"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />

          {categories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">すべてのカテゴリ</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}

          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="name">店舗名順</option>
            <option value="category">カテゴリ順</option>
          </select>
        </div>

        {isLoading ? (
          <p className="text-gray-500 text-sm">読み込み中...</p>
        ) : stores.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">店舗がありません</div>
        ) : visibleStores.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            検索条件に一致する店舗がありません
          </div>
        ) : (
          <ul className="space-y-3">
            {visibleStores.map((store) => (
              <li
                key={store.id}
                data-testid="store-item"
                className="bg-white rounded-lg shadow p-4 flex justify-between items-center"
              >
                <button
                  type="button"
                  onClick={() => navigate(`/stores/${store.id}`)}
                  className="text-left"
                >
                  <p className="font-medium text-gray-900 hover:underline">{store.name}</p>
                  <p className="text-xs text-gray-500">
                    {store.category}
                    {store.open_time && store.close_time && ` ・ ${store.open_time} - ${store.close_time}`}
                  </p>
                </button>
                <div className="flex items-center gap-3">
                  {user && <LikeButton userId={user.id} storeId={store.id} initialCount={likeCounts[store.id] ?? 0} />}
                  <button
                    type="button"
                    onClick={() => setReservingStore(store)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
                  >
                    座席予約
                  </button>
                </div>
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
          onViewReservations={() => navigate('/reservations')}
        />
      )}
    </div>
  )
}
