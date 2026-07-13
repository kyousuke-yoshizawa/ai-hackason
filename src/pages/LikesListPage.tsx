import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getUserLikes } from '../lib/likes'

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
          <h1 className="text-xl font-bold text-gray-900">いいね一覧</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="newest">新しい順</option>
            <option value="oldest">古い順</option>
            <option value="name">店舗名順</option>
          </select>

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
        </div>

        {isLoading ? (
          <p className="text-gray-500 text-sm">読み込み中...</p>
        ) : visibleRows.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            まだいいねした店舗がありません
          </div>
        ) : (
          <ul className="space-y-3">
            {visibleRows.map((row) => (
              <li
                key={row.likeId}
                className="bg-white rounded-lg shadow p-4 flex justify-between items-center"
              >
                <div>
                  <p className="font-medium text-gray-900">{row.storeName}</p>
                  {row.category && <p className="text-xs text-gray-500">{row.category}</p>}
                </div>
                <span className="text-red-500">♥</span>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
