import { useEffect, useState } from 'react'
import { api, ApiError } from '../lib/api'
import { AdminUser, UserForm, UserFormValues } from './UserForm'

export function UserManagementPanel({
  onNotify,
}: {
  onNotify: (message: string, type?: 'success' | 'error') => void
}) {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [formMode, setFormMode] = useState<'create' | AdminUser | null>(null)

  const loadUsers = async () => {
    setIsLoading(true)
    try {
      const res = await api.get<{ data: AdminUser[] }>('/api/users')
      setUsers(res.data)
    } catch (err) {
      onNotify(err instanceof ApiError ? err.message : 'ユーザ一覧の取得に失敗しました', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (values: UserFormValues) => {
    try {
      if (formMode && formMode !== 'create') {
        await api.put(`/api/users/${formMode.id}`, values)
        onNotify('ユーザを更新しました')
      } else {
        await api.post('/api/users', values)
        onNotify('ユーザを登録しました')
      }
      setFormMode(null)
      await loadUsers()
    } catch (err) {
      onNotify(err instanceof ApiError ? err.message : '保存に失敗しました', 'error')
    }
  }

  const handleDeactivate = async (targetUser: AdminUser) => {
    if (!confirm(`${targetUser.name} を無効化しますか？`)) return
    try {
      await api.delete(`/api/users/${targetUser.id}`)
      onNotify('ユーザを無効化しました')
      await loadUsers()
    } catch (err) {
      onNotify(err instanceof ApiError ? err.message : '無効化に失敗しました', 'error')
    }
  }

  return (
    <div>
      <div className="mb-4 flex justify-between">
        <h3 className="text-lg font-extrabold text-wood-800">ユーザ管理</h3>
        <button onClick={() => setFormMode('create')} className="ac-btn-primary !px-4 !py-2 text-sm">
          新規登録
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm font-bold text-wood-400">読み込み中...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-y-2 text-sm">
            <thead>
              <tr className="text-left text-xs font-bold uppercase tracking-wide text-wood-500">
                <th className="px-4 py-2">メール</th>
                <th className="px-4 py-2">名前</th>
                <th className="px-4 py-2">ロール</th>
                <th className="px-4 py-2">状態</th>
                <th className="px-4 py-2">アクション</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="bg-sand-50">
                  <td className="rounded-l-2xl border-y-2 border-l-2 border-wood-200 px-4 py-2 text-wood-800">
                    {u.email}
                  </td>
                  <td className="border-y-2 border-wood-200 px-4 py-2 text-wood-800">{u.name}</td>
                  <td className="border-y-2 border-wood-200 px-4 py-2">
                    <span className="ac-badge bg-sky-100 text-sky-700">{u.role}</span>
                  </td>
                  <td className="border-y-2 border-wood-200 px-4 py-2">
                    {u.is_active ? (
                      <span className="ac-badge bg-leaf-100 text-leaf-700">有効</span>
                    ) : (
                      <span className="ac-badge bg-wood-100 text-wood-500">無効</span>
                    )}
                  </td>
                  <td className="rounded-r-2xl border-y-2 border-r-2 border-wood-200 px-4 py-2 space-x-3">
                    <button
                      onClick={() => setFormMode(u)}
                      className="font-bold text-leaf-600 hover:underline"
                    >
                      編集
                    </button>
                    {u.is_active && (
                      <button
                        onClick={() => handleDeactivate(u)}
                        className="font-bold text-bubble-600 hover:underline"
                      >
                        無効化
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="rounded-2xl border-2 border-wood-200 bg-sand-50 px-4 py-6 text-center text-wood-400"
                  >
                    ユーザがいません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {formMode && (
        <UserForm
          initialUser={formMode === 'create' ? undefined : formMode}
          onSubmit={handleSubmit}
          onCancel={() => setFormMode(null)}
        />
      )}
    </div>
  )
}
