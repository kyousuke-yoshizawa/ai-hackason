import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { api, ApiError } from '../lib/api'

interface ErrorLog {
  id: string
  error_type: string
  message: string
  stack_trace: string | null
  user_id: string | null
  affected_resource_id: string | null
  status: 'new' | 'reviewing' | 'resolved'
  created_at: string
  updated_at: string
}

const STATUS_BADGE: Record<ErrorLog['status'], string> = {
  new: 'bg-red-100 text-red-800',
  reviewing: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-green-100 text-green-800',
}

const STATUS_LABEL: Record<ErrorLog['status'], string> = {
  new: '新規',
  reviewing: '確認中',
  resolved: '解決済み',
}

export default function ErrorManagementDashboard({ onBack }: { onBack: () => void }) {
  const { user } = useAuth()
  const [errors, setErrors] = useState<ErrorLog[]>([])
  const [statusFilter, setStatusFilter] = useState<'all' | ErrorLog['status']>('all')
  const [selected, setSelected] = useState<ErrorLog | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const fetchErrors = async () => {
    if (!user) return
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const query = statusFilter === 'all' ? '' : `?status=${statusFilter}`
      setErrors(await api.get<ErrorLog[]>(`/api/errors${query}`))
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'エラー一覧の取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchErrors()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  const updateStatus = async (errorId: string, status: ErrorLog['status']) => {
    if (!user) return
    try {
      const updated = await api.patch<ErrorLog>(`/api/errors/${errorId}`, { status })
      setErrors((prev) => prev.map((e) => (e.id === errorId ? updated : e)))
      setSelected((prev) => (prev && prev.id === errorId ? updated : prev))
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'ステータス更新に失敗しました')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">エラー管理ダッシュボード</h1>
            <p className="text-sm text-gray-600">admin 専用</p>
          </div>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-sm font-medium transition"
          >
            ダッシュボードに戻る
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-4">
          <label htmlFor="status-filter" className="text-sm text-gray-600">
            ステータス絞り込み:
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="all">すべて</option>
            <option value="new">新規</option>
            <option value="reviewing">確認中</option>
            <option value="resolved">解決済み</option>
          </select>
        </div>

        {errorMessage && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2">
            {errorMessage}
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-600">エラータイプ</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">メッセージ</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">影響リソース</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">状態</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">発生時刻</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                    読み込み中...
                  </td>
                </tr>
              )}
              {!isLoading && errors.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                    エラーはありません
                  </td>
                </tr>
              )}
              {errors.map((e) => (
                <tr
                  key={e.id}
                  onClick={() => setSelected(e)}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <td className="px-4 py-2 font-medium text-gray-900">{e.error_type}</td>
                  <td className="px-4 py-2 text-gray-700 max-w-md truncate">{e.message}</td>
                  <td className="px-4 py-2 text-gray-500">{e.affected_resource_id ?? '-'}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[e.status]}`}>
                      {STATUS_LABEL[e.status]}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-500">
                    {new Date(e.created_at).toLocaleString('ja-JP')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {selected && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-bold text-gray-900">{selected.error_type}</h2>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[selected.status]}`}>
                {STATUS_LABEL[selected.status]}
              </span>
            </div>

            <p className="text-sm text-gray-700 mb-3">{selected.message}</p>

            <div className="text-xs text-gray-500 mb-3 space-y-1">
              <p>発生ユーザ: {selected.user_id ?? '不明'}</p>
              <p>影響リソース: {selected.affected_resource_id ?? '-'}</p>
              <p>発生時刻: {new Date(selected.created_at).toLocaleString('ja-JP')}</p>
            </div>

            {selected.stack_trace && (
              <pre className="bg-gray-900 text-gray-100 text-xs rounded-lg p-3 overflow-x-auto mb-4">
                {selected.stack_trace}
              </pre>
            )}

            <div className="flex gap-2 justify-end">
              {selected.status !== 'reviewing' && (
                <button
                  onClick={() => updateStatus(selected.id, 'reviewing')}
                  className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-medium"
                >
                  確認中にする
                </button>
              )}
              {selected.status !== 'resolved' && (
                <button
                  onClick={() => updateStatus(selected.id, 'resolved')}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
                >
                  解決済みにする
                </button>
              )}
              <button
                onClick={() => setSelected(null)}
                className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-sm font-medium"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
