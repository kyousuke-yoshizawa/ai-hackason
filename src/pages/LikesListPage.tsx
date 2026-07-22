import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getUserLikes } from '../lib/likes'
import Cloud from '../components/decor/Cloud'
import Flower from '../components/decor/Flower'
import GrassBorder from '../components/decor/GrassBorder'
import { CategorySelect } from '../components/ui/CategorySelect'

type SortKey = 'newest' | 'oldest' | 'name'

interface LikedStoreRow {
  likeId: string
  storeId: string
  storeName: string
  category: string | null
  likedAt: string
}

export default function LikesListPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [rows, setRows] = useState<LikedStoreRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>('newest')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  useEffect(() => {
    if (!user) return

    let cancelled = false
    setIsLoading(true)

    getUserLikes(user.id).then((result) => {
      if (cancelled) return
      if (result.success) {
        const mapped = result.likes.map((row) => ({
          likeId: row.id,
          storeId: row.store_id,
          storeName: row.stores?.name ?? '（店舗情報なし）',
          category: row.stores?.category ?? null,
          likedAt: row.created_at,
        }))
        setRows(mapped)
      }
      setIsLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [user])

  const categories = useMemo(
    () => Array.from(new Set(rows.map((r) => r.category).filter((c): c is string => !!c))),
    [rows]
  )

  const visibleRows = useMemo(() => {
    const filtered =
      categoryFilter === 'all' ? rows : rows.filter((r) => r.category === categoryFilter)

    return [...filtered].sort((a, b) => {
      if (sortKey === 'newest') return b.likedAt.localeCompare(a.likedAt)
      if (sortKey === 'oldest') return a.likedAt.localeCompare(b.likedAt)
      return a.storeName.localeCompare(b.storeName, 'ja')
    })
  }, [rows, sortKey, categoryFilter])

  return (
    <div className="relative overflow-hidden">
      <header className="ac-header">
        <Cloud className="absolute right-6 top-2 h-8 w-16 opacity-30" />
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <h1 className="text-xl font-extrabold">いいね一覧</h1>
        </div>
        <GrassBorder className="absolute -bottom-[5px] left-0 h-2 w-full" color="#eef9ff" />
      </header>

      <Flower className="absolute right-8 top-28 h-10 w-10 opacity-80 md:right-20" />
      <Flower className="absolute left-6 top-1/2 h-8 w-8 opacity-70" color="#ffd07d" center="#ff8fb8" />

      <main className="relative max-w-4xl mx-auto px-4 py-8">
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="ac-input !w-auto text-sm"
          >
            <option value="newest">新しい順</option>
            <option value="oldest">古い順</option>
            <option value="name">店舗名順</option>
          </select>

          {categories.length > 0 && (
            <CategorySelect
              categories={categories}
              value={categoryFilter}
              onChange={setCategoryFilter}
              className="text-sm"
            />
          )}
        </div>

        {isLoading ? (
          <p className="text-wood-500 text-sm font-bold">読み込み中...</p>
        ) : visibleRows.length === 0 ? (
          <div className="ac-card text-center text-wood-500">
            まだいいねした店舗がありません
          </div>
        ) : (
          <ul className="space-y-3">
            {visibleRows.map((row) => (
              <li key={row.likeId} className="ac-card-sm">
                <button
                  type="button"
                  onClick={() => navigate(`/stores/${row.storeId}`)}
                  className="w-full flex justify-between items-center text-left"
                >
                  <div>
                    <p className="font-bold text-wood-800 hover:underline">{row.storeName}</p>
                    {row.category && <p className="text-xs text-wood-400">{row.category}</p>}
                  </div>
                  <span className="text-bubble-500">♥</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
