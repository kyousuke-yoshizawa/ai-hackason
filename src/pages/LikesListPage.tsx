import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getUserLikes } from '../lib/likes'
import { useApiQuery } from '../hooks/useApiQuery'
import { PageHeader } from '../components/ui/PageHeader'
import { LoadingText } from '../components/ui/LoadingText'
import { EmptyCard } from '../components/ui/EmptyCard'
import Cloud from '../components/decor/Cloud'
import Flower from '../components/decor/Flower'

type SortKey = 'newest' | 'oldest' | 'name'

interface LikedStoreRow {
  likeId: string
  storeId: string
  storeName: string
  category: string | null
  likedAt: string
}

const EMPTY_ROWS: LikedStoreRow[] = []

export default function LikesListPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [sortKey, setSortKey] = useState<SortKey>('newest')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  const { data: rowsData, isLoading } = useApiQuery<LikedStoreRow[]>(
    async () => {
      const result = await getUserLikes(user!.id)
      if (!result.success) return []
      return result.likes.map((row) => ({
        likeId: row.id,
        storeId: row.store_id,
        storeName: row.stores?.name ?? '（店舗情報なし）',
        category: row.stores?.category ?? null,
        likedAt: row.created_at,
      }))
    },
    [user?.id],
    { enabled: !!user }
  )
  const rows = rowsData ?? EMPTY_ROWS

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
      <PageHeader
        title="いいね一覧"
        decor={<Cloud className="absolute right-6 top-2 h-8 w-16 opacity-30" />}
      />

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
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
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
        </div>

        {isLoading ? (
          <LoadingText />
        ) : visibleRows.length === 0 ? (
          <EmptyCard message="まだいいねした店舗がありません" />
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
