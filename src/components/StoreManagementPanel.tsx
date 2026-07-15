import { useEffect, useState } from 'react'
import { api, ApiError } from '../lib/api'
import { AdminStore, StoreForm } from './StoreForm'
import { CrowdAnalyticsDashboard } from './CrowdAnalyticsDashboard'
import { StoreMediaPanel } from './StoreMediaPanel'

export function StoreManagementPanel({
  onNotify,
}: {
  onNotify: (message: string, type?: 'success' | 'error') => void
}) {
  const [stores, setStores] = useState<AdminStore[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [formMode, setFormMode] = useState<'create' | AdminStore | null>(null)
  const [analyticsStore, setAnalyticsStore] = useState<AdminStore | null>(null)
  const [mediaStore, setMediaStore] = useState<AdminStore | null>(null)

  const loadStores = async (category: string) => {
    setIsLoading(true)
    try {
      const query = category ? `?category=${encodeURIComponent(category)}` : ''
      const res = await api.get<{ data: AdminStore[] }>(`/api/stores${query}`)
      setStores(res.data)
    } catch (err) {
      onNotify(err instanceof ApiError ? err.message : '店舗一覧の取得に失敗しました', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadStores(categoryFilter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter])

  const handleSubmit = async (values: Omit<AdminStore, 'id'>) => {
    try {
      if (formMode && formMode !== 'create') {
        await api.put(`/api/stores/${formMode.id}`, values)
        onNotify('店舗を更新しました')
      } else {
        await api.post('/api/stores', values)
        onNotify('店舗を登録しました')
      }
      setFormMode(null)
      await loadStores(categoryFilter)
    } catch (err) {
      onNotify(err instanceof ApiError ? err.message : '保存に失敗しました', 'error')
    }
  }

  const handleDelete = async (store: AdminStore) => {
    if (!confirm(`${store.name} を削除しますか？`)) return
    try {
      await api.delete(`/api/stores/${store.id}`)
      onNotify('店舗を削除しました')
      await loadStores(categoryFilter)
    } catch (err) {
      onNotify(err instanceof ApiError ? err.message : '削除に失敗しました', 'error')
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-extrabold text-wood-800">🏬 店舗管理</h3>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="カテゴリで絞込"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="ac-input !w-auto"
          />
          <button onClick={() => setFormMode('create')} className="ac-btn-primary">
            新規登録
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm font-bold text-wood-500">読み込み中...</p>
      ) : (
        <div className="space-y-3">
          <div className="hidden gap-4 px-4 text-xs font-bold text-wood-500 md:grid md:grid-cols-[2fr_1.2fr_1.5fr_2.3fr]">
            <span>名前</span>
            <span>カテゴリ</span>
            <span>営業時間</span>
            <span>アクション</span>
          </div>
          {stores.map((s) => (
            <div
              key={s.id}
              className="grid grid-cols-1 gap-2 rounded-2xl border-2 border-wood-200 bg-sand-50 p-4 md:grid-cols-[2fr_1.2fr_1.5fr_2.3fr] md:items-center"
            >
              <p className="font-bold text-wood-800">{s.name}</p>
              <p>
                <span className="ac-badge bg-leaf-100 text-leaf-700">{s.category}</span>
              </p>
              <p className="text-sm text-wood-600">
                {s.open_time && s.close_time ? `${s.open_time} - ${s.close_time}` : '-'}
              </p>
              <div className="flex flex-wrap gap-3 text-sm">
                <button onClick={() => setFormMode(s)} className="font-bold text-leaf-600 hover:underline">
                  編集
                </button>
                <button
                  onClick={() => setAnalyticsStore(s)}
                  className="font-bold text-sky-600 hover:underline"
                >
                  混雑分析
                </button>
                <button
                  onClick={() => setMediaStore(s)}
                  className="font-bold text-wood-600 hover:underline"
                >
                  メディア管理
                </button>
                <button
                  onClick={() => handleDelete(s)}
                  className="font-bold text-bubble-600 hover:underline"
                >
                  削除
                </button>
              </div>
            </div>
          ))}
          {stores.length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-wood-200 bg-sand-50/60 px-4 py-6 text-center text-wood-400">
              店舗がありません
            </div>
          )}
        </div>
      )}

      {formMode && (
        <StoreForm
          initialStore={formMode === 'create' ? undefined : formMode}
          onSubmit={handleSubmit}
          onCancel={() => setFormMode(null)}
        />
      )}

      {analyticsStore && (
        <CrowdAnalyticsDashboard
          storeId={analyticsStore.id}
          storeName={analyticsStore.name}
          onClose={() => setAnalyticsStore(null)}
        />
      )}

      {mediaStore && (
        <StoreMediaPanel
          storeId={mediaStore.id}
          storeName={mediaStore.name}
          onClose={() => setMediaStore(null)}
          onNotify={onNotify}
        />
      )}
    </div>
  )
}
