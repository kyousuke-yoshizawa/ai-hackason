import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { api, ApiError } from '../lib/api'
import { useApiQuery } from '../hooks/useApiQuery'
import { PageHeader } from '../components/ui/PageHeader'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { Modal } from '../components/Modal'
import Leaf from '../components/decor/Leaf'

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
  new: 'bg-bubble-100 text-bubble-700',
  reviewing: 'bg-sand-200 text-wood-700',
  resolved: 'bg-leaf-100 text-leaf-700',
}

const STATUS_LABEL: Record<ErrorLog['status'], string> = {
  new: '新規',
  reviewing: '確認中',
  resolved: '解決済み',
}

export default function ErrorManagementDashboard() {
  const { user } = useAuth()
  const [statusFilter, setStatusFilter] = useState<'all' | ErrorLog['status']>('all')
  const [selected, setSelected] = useState<ErrorLog | null>(null)
  const [operationError, setOperationError] = useState<string | null>(null)

  const {
    data: fetchedErrors,
    isLoading,
    error: loadError,
  } = useApiQuery(
    async () => {
      const query = statusFilter === 'all' ? '' : `?status=${statusFilter}`
      return api.get<ErrorLog[]>(`/api/errors${query}`)
    },
    [statusFilter, user?.id],
    { enabled: !!user, fallbackMessage: 'エラー一覧の取得に失敗しました' }
  )
  // updateStatus後にサーバ再取得を待たず即座に反映するため、ローカルにミラーして編集する
  const [errors, setErrors] = useState<ErrorLog[]>([])
  useEffect(() => {
    if (fetchedErrors) setErrors(fetchedErrors)
  }, [fetchedErrors])
  useEffect(() => {
    setOperationError(null)
  }, [statusFilter])
  const errorMessage = operationError ?? loadError

  const updateStatus = async (errorId: string, status: ErrorLog['status']) => {
    if (!user) return
    try {
      const updated = await api.patch<ErrorLog>(`/api/errors/${errorId}`, { status })
      setErrors((prev) => prev.map((e) => (e.id === errorId ? updated : e)))
      setSelected((prev) => (prev && prev.id === errorId ? updated : prev))
    } catch (err) {
      setOperationError(err instanceof ApiError ? err.message : 'ステータス更新に失敗しました')
    }
  }

  return (
    <>
      <PageHeader
        title="エラー管理ダッシュボード"
        subtitle="admin 専用"
        maxWidth="max-w-7xl"
        decor={<Leaf className="absolute right-6 top-2 h-8 w-8 opacity-30" color="#dff1cf" />}
      />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-4">
          <label htmlFor="status-filter" className="ac-label mb-0">
            ステータス絞り込み:
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="ac-input w-auto py-1.5"
          >
            <option value="all">すべて</option>
            <option value="new">新規</option>
            <option value="reviewing">確認中</option>
            <option value="resolved">解決済み</option>
          </select>
        </div>

        {errorMessage && <ErrorBanner message={errorMessage} />}

        <div className="ac-card overflow-x-auto !p-0">
          <table className="min-w-full divide-y divide-sand-200 text-sm">
            <thead className="bg-sand-100">
              <tr>
                <th className="px-4 py-2 text-left font-bold text-wood-600">エラータイプ</th>
                <th className="px-4 py-2 text-left font-bold text-wood-600">メッセージ</th>
                <th className="px-4 py-2 text-left font-bold text-wood-600">影響リソース</th>
                <th className="px-4 py-2 text-left font-bold text-wood-600">状態</th>
                <th className="px-4 py-2 text-left font-bold text-wood-600">発生時刻</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-100">
              {isLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-wood-400">
                    読み込み中...
                  </td>
                </tr>
              )}
              {!isLoading && errors.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-wood-400">
                    エラーはありません
                  </td>
                </tr>
              )}
              {errors.map((e) => (
                <tr
                  key={e.id}
                  onClick={() => setSelected(e)}
                  className="cursor-pointer hover:bg-sand-100/60"
                >
                  <td className="px-4 py-2 font-bold text-wood-800">{e.error_type}</td>
                  <td className="px-4 py-2 text-wood-600 max-w-md truncate">{e.message}</td>
                  <td className="px-4 py-2 text-wood-400">{e.affected_resource_id ?? '-'}</td>
                  <td className="px-4 py-2">
                    <span className={`ac-badge ${STATUS_BADGE[e.status]}`}>
                      {STATUS_LABEL[e.status]}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-wood-400">
                    {new Date(e.created_at).toLocaleString('ja-JP')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {selected && (
        <Modal
          title={
            <span className="flex items-center gap-2">
              {selected.error_type}
              <span className={`ac-badge ${STATUS_BADGE[selected.status]}`}>
                {STATUS_LABEL[selected.status]}
              </span>
            </span>
          }
          onClose={() => setSelected(null)}
          maxWidth="max-w-2xl"
          maxHeight="max-h-[80vh]"
          zIndex="z-50"
        >
          <p className="text-sm text-wood-600 mb-3">{selected.message}</p>

          <div className="text-xs text-wood-400 mb-3 space-y-1">
            <p>発生ユーザ: {selected.user_id ?? '不明'}</p>
            <p>影響リソース: {selected.affected_resource_id ?? '-'}</p>
            <p>発生時刻: {new Date(selected.created_at).toLocaleString('ja-JP')}</p>
          </div>

          {selected.stack_trace && (
            <pre className="bg-wood-900 text-wood-100 text-xs rounded-2xl p-3 overflow-x-auto mb-4">
              {selected.stack_trace}
            </pre>
          )}

          <div className="flex gap-2 justify-end">
            {selected.status !== 'reviewing' && (
              <button
                onClick={() => updateStatus(selected.id, 'reviewing')}
                className="ac-btn-secondary !px-3 !py-1.5 text-sm"
              >
                確認中にする
              </button>
            )}
            {selected.status !== 'resolved' && (
              <button
                onClick={() => updateStatus(selected.id, 'resolved')}
                className="ac-btn-primary !px-3 !py-1.5 text-sm"
              >
                解決済みにする
              </button>
            )}
            <button onClick={() => setSelected(null)} className="ac-btn-ghost !px-3 !py-1.5 text-sm">
              閉じる
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
