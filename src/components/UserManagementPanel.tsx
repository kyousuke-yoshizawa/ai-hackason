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
        <h3 className="text-lg font-bold text-gray-900">ユーザ管理</h3>
        <button
          onClick={() => setFormMode('create')}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          新規登録
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">読み込み中...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-600">メール</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">名前</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">ロール</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">状態</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">アクション</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-2">{u.email}</td>
                  <td className="px-4 py-2">{u.name}</td>
                  <td className="px-4 py-2">{u.role}</td>
                  <td className="px-4 py-2">
                    {u.is_active ? (
                      <span className="text-green-600">有効</span>
                    ) : (
                      <span className="text-gray-400">無効</span>
                    )}
                  </td>
                  <td className="px-4 py-2 space-x-3">
                    <button
                      onClick={() => setFormMode(u)}
                      className="font-medium text-indigo-600 hover:underline"
                    >
                      編集
                    </button>
                    {u.is_active && (
                      <button
                        onClick={() => handleDeactivate(u)}
                        className="font-medium text-red-600 hover:underline"
                      >
                        無効化
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
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
