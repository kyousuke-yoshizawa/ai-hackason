import { useEffect, useState } from 'react'
import { api, ApiError } from '../lib/api'
import { AdminStore, StoreForm } from './StoreForm'
import { CrowdAnalyticsDashboard } from './CrowdAnalyticsDashboard'

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
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-gray-900">店舗管理</h3>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="カテゴリで絞込"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            onClick={() => setFormMode('create')}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            新規登録
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">読み込み中...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-600">名前</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">カテゴリ</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">営業時間</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">アクション</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {stores.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-2">{s.name}</td>
                  <td className="px-4 py-2">{s.category}</td>
                  <td className="px-4 py-2">
                    {s.open_time && s.close_time ? `${s.open_time} - ${s.close_time}` : '-'}
                  </td>
                  <td className="px-4 py-2 space-x-3">
                    <button
                      onClick={() => setFormMode(s)}
                      className="font-medium text-indigo-600 hover:underline"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => setAnalyticsStore(s)}
                      className="font-medium text-emerald-600 hover:underline"
                    >
                      混雑分析
                    </button>
                    <button
                      onClick={() => handleDelete(s)}
                      className="font-medium text-red-600 hover:underline"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))}
              {stores.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                    店舗がありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
    </div>
  )
}
