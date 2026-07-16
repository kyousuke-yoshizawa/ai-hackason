import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { useApiQuery } from '../hooks/useApiQuery'
import LikeButton from '../components/LikeButton'
import ReservationModal from '../components/ReservationModal'
import { PageHeader } from '../components/ui/PageHeader'
import { LoadingText } from '../components/ui/LoadingText'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { EmptyCard } from '../components/ui/EmptyCard'
import type { AdminStore } from '../components/StoreForm'
import Cloud from '../components/decor/Cloud'
import Leaf from '../components/decor/Leaf'

type SortKey = 'name' | 'category'

const EMPTY_STORES: AdminStore[] = []

export default function StoresPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const {
    data: storesData,
    isLoading,
    error,
  } = useApiQuery(async () => (await api.get<{ data: AdminStore[] }>('/api/stores')).data, [], {
    fallbackMessage: '店舗一覧の取得に失敗しました',
  })
  const stores = storesData ?? EMPTY_STORES
  const [reservingStore, setReservingStore] = useState<AdminStore | null>(null)
  const [draftSearchText, setDraftSearchText] = useState('')
  const [draftCategoryFilter, setDraftCategoryFilter] = useState('all')
  const [appliedSearchText, setAppliedSearchText] = useState('')
  const [appliedCategoryFilter, setAppliedCategoryFilter] = useState('all')
  const [sortKey, setSortKey] = useState<SortKey>('name')

  const categories = useMemo(() => Array.from(new Set(stores.map((s) => s.category))), [stores])

  const handleSearch = () => {
    setAppliedSearchText(draftSearchText)
    setAppliedCategoryFilter(draftCategoryFilter)
  }

  const handleClear = () => {
    setDraftSearchText('')
    setDraftCategoryFilter('all')
    setAppliedSearchText('')
    setAppliedCategoryFilter('all')
  }

  const visibleStores = useMemo(() => {
    const text = appliedSearchText.trim().toLowerCase()
    const filtered = stores.filter((s) => {
      const matchesText = text === '' || s.name.toLowerCase().includes(text)
      const matchesCategory = appliedCategoryFilter === 'all' || s.category === appliedCategoryFilter
      return matchesText && matchesCategory
    })

    return [...filtered].sort((a, b) => {
      const primary = a[sortKey].localeCompare(b[sortKey], 'ja')
      if (primary !== 0) return primary
      return a.name.localeCompare(b.name, 'ja')
    })
  }, [stores, appliedSearchText, appliedCategoryFilter, sortKey])

  return (
    <div className="ac-page-bg">
      <PageHeader
        title="店舗一覧"
        backTo="/dashboard"
        backLabel="← ダッシュボードに戻る"
        backVariant="ghost"
        decor={<Cloud className="absolute right-6 top-2 h-8 w-16 opacity-30" />}
      />

      <main className="relative mx-auto max-w-4xl px-4 py-8">
        {error && <ErrorBanner message={error} />}

        <div className="flex flex-wrap gap-3 mb-6">
          <input
            type="text"
            placeholder="店舗名で検索"
            value={draftSearchText}
            onChange={(e) => setDraftSearchText(e.target.value)}
            className="ac-input !w-auto text-sm"
          />

          {categories.length > 0 && (
            <select
              value={draftCategoryFilter}
              onChange={(e) => setDraftCategoryFilter(e.target.value)}
              className="ac-input !w-auto text-sm"
            >
              <option value="all">すべてのカテゴリ</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}

          <button onClick={handleSearch} className="ac-btn-secondary text-sm">
            検索
          </button>
          <button onClick={handleClear} className="ac-btn-ghost text-sm">
            クリア
          </button>

          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="ac-input !w-auto text-sm"
          >
            <option value="name">店舗名順</option>
            <option value="category">カテゴリ順</option>
          </select>
        </div>

        {isLoading ? (
          <LoadingText />
        ) : stores.length === 0 ? (
          <EmptyCard message="店舗がありません" decor={<Leaf className="absolute -top-4 -left-4 h-9 w-9 -rotate-12 drop-shadow" />} />
        ) : visibleStores.length === 0 ? (
          <EmptyCard message="検索条件に一致する店舗がありません" />
        ) : (
          <ul className="space-y-3">
            {visibleStores.map((store) => (
              <li
                key={store.id}
                data-testid="store-item"
                className="ac-card-sm flex items-center justify-between"
              >
                <button
                  type="button"
                  onClick={() => navigate(`/stores/${store.id}`)}
                  className="text-left"
                >
                  <p className="font-bold text-wood-800 hover:underline">{store.name}</p>
                  <p className="text-xs text-wood-400">
                    {store.category}
                    {store.open_time && store.close_time && ` ・ ${store.open_time} - ${store.close_time}`}
                  </p>
                </button>
                <div className="flex items-center gap-3">
                  {user && (
                    <LikeButton userId={user.id} storeId={store.id} initialCount={store.like_count ?? 0} />
                  )}
                  <button
                    type="button"
                    onClick={() => setReservingStore(store)}
                    className="ac-btn-primary !px-4 !py-2 text-sm"
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
