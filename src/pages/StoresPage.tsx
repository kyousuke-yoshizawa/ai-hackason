import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api, ApiError } from '../lib/api'
import { getStoreLikeCount } from '../lib/likes'
import LikeButton from '../components/LikeButton'
import ReservationModal from '../components/ReservationModal'
import type { AdminStore } from '../components/StoreForm'
import Cloud from '../components/decor/Cloud'
import Leaf from '../components/decor/Leaf'
import GrassBorder from '../components/decor/GrassBorder'

type SortKey = 'name' | 'category'

const CATEGORY_EMOJI: Record<string, string> = {
  ラーメン: '🍜',
  中華: '🥟',
  カフェ: '☕',
  喫茶店: '☕',
  雑貨: '🛍️',
  和食: '🍱',
  居酒屋: '🍶',
  寿司: '🍣',
  Sushi: '🍣',
  焼肉: '🥩',
  イタリアン: '🍝',
  パン: '🥐',
  Bakery: '🥐',
  ベーカリー: '🥐',
  カレー: '🍛',
  スイーツ: '🍰',
  デザート: '🍰',
  バー: '🍸',
  焼鳥: '🍢',
}

function getCategoryEmoji(category: string): string {
  if (CATEGORY_EMOJI[category]) return CATEGORY_EMOJI[category]
  const match = Object.entries(CATEGORY_EMOJI).find(([key]) => category.includes(key))
  return match ? match[1] : '🏠'
}

function StoreThumbnail({ store }: { store: AdminStore }) {
  const [imageFailed, setImageFailed] = useState(false)

  if (store.thumbnail_url && !imageFailed) {
    return (
      <img
        src={store.thumbnail_url}
        alt={store.name}
        loading="lazy"
        onError={() => setImageFailed(true)}
        className="h-14 w-14 shrink-0 rounded-2xl border-2 border-wood-200 object-cover shadow-ac-sm"
      />
    )
  }

  return (
    <div
      role="img"
      aria-label={`${store.name}のイメージ`}
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-wood-200 bg-sand-100 text-2xl shadow-ac-sm"
    >
      {getCategoryEmoji(store.category)}
    </div>
  )
}

export default function StoresPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [stores, setStores] = useState<AdminStore[]>([])
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reservingStore, setReservingStore] = useState<AdminStore | null>(null)
  const [draftSearchText, setDraftSearchText] = useState('')
  const [draftCategoryFilter, setDraftCategoryFilter] = useState('all')
  const [appliedSearchText, setAppliedSearchText] = useState('')
  const [appliedCategoryFilter, setAppliedCategoryFilter] = useState('all')
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
      <header className="ac-header relative">
        <Cloud className="absolute right-6 top-2 h-8 w-16 opacity-30" />
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-4">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="ac-btn-ghost !px-3 !py-1.5 text-sm !text-white hover:!bg-white/20"
          >
            ← ダッシュボードに戻る
          </button>
          <h1 className="text-xl font-extrabold">店舗一覧</h1>
        </div>
        <GrassBorder className="absolute -bottom-[5px] left-0 h-2 w-full" color="#eef9ff" />
      </header>

      <main className="relative mx-auto max-w-4xl px-4 py-8">
        {error && (
          <p className="mb-4 rounded-2xl border-2 border-bubble-200 bg-bubble-50 px-4 py-2 text-sm font-bold text-bubble-700">
            {error}
          </p>
        )}

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
          <p className="text-sm font-bold text-wood-500">読み込み中...</p>
        ) : stores.length === 0 ? (
          <div className="ac-card relative text-center text-wood-500">
            <Leaf className="absolute -top-4 -left-4 h-9 w-9 -rotate-12 drop-shadow" />
            店舗がありません
          </div>
        ) : visibleStores.length === 0 ? (
          <div className="ac-card relative text-center text-wood-500">
            検索条件に一致する店舗がありません
          </div>
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
                  className="flex items-center gap-3 text-left"
                >
                  <StoreThumbnail store={store} />
                  <div>
                    <p className="font-bold text-wood-800 hover:underline">{store.name}</p>
                    <p className="text-xs text-wood-400">
                      {store.category}
                      {store.open_time && store.close_time && ` ・ ${store.open_time} - ${store.close_time}`}
                    </p>
                  </div>
                </button>
                <div className="flex items-center gap-3">
                  {user && <LikeButton userId={user.id} storeId={store.id} initialCount={likeCounts[store.id] ?? 0} />}
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
