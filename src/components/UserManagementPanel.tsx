import { useMemo } from 'react'
import { api, ApiError } from '../lib/api'
import { useMasterTable } from '../hooks/useMasterTable'
import { AdminUser, UserForm, UserFormValues } from './UserForm'
import { SortableHeader } from './SortableHeader'
import { LoadingText } from './ui/LoadingText'

type UserSortKey = 'email' | 'name' | 'role'
type UserFilters = { role: string; active: string }

export function UserManagementPanel({
  onNotify,
}: {
  onNotify: (message: string, type?: 'success' | 'error') => void
}) {
  const {
    items: users,
    isLoading,
    reload: loadUsers,
    draftSearchText,
    setDraftSearchText,
    appliedSearchText,
    draftFilters,
    setDraftFilter,
    appliedFilters,
    sortKey,
    sortDir,
    handleSort,
    formMode,
    setFormMode,
    handleSearch,
    handleClear,
  } = useMasterTable<AdminUser, UserSortKey, UserFilters>({
    fetchItems: async () => {
      const res = await api.get<{ data: AdminUser[] }>('/api/users?limit=100')
      return res.data
    },
    loadErrorMessage: 'ユーザ一覧の取得に失敗しました',
    onNotify,
    initialSortKey: 'name',
    initialFilters: { role: 'all', active: 'all' },
  })

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

  const visibleUsers = useMemo(() => {
    const text = appliedSearchText.trim().toLowerCase()
    const filtered = users.filter((u) => {
      const matchesText =
        text === '' || u.name.toLowerCase().includes(text) || u.email.toLowerCase().includes(text)
      const matchesRole = appliedFilters.role === 'all' || u.role === appliedFilters.role
      const matchesActive =
        appliedFilters.active === 'all' || (appliedFilters.active === 'active' ? u.is_active : !u.is_active)
      return matchesText && matchesRole && matchesActive
    })

    const dir = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      const primary = a[sortKey].localeCompare(b[sortKey], 'ja')
      if (primary !== 0) return primary * dir
      return sortKey === 'name' ? 0 : a.name.localeCompare(b.name, 'ja')
    })
  }, [users, appliedSearchText, appliedFilters, sortKey, sortDir])

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-extrabold text-wood-800">ユーザ管理</h3>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="名前・メールで検索"
            value={draftSearchText}
            onChange={(e) => setDraftSearchText(e.target.value)}
            className="ac-input !w-auto"
          />
          <select
            value={draftFilters.role}
            onChange={(e) => setDraftFilter('role', e.target.value)}
            className="ac-input !w-auto"
          >
            <option value="all">すべてのロール</option>
            <option value="admin">admin</option>
            <option value="store_manager">store_manager</option>
            <option value="user">user</option>
          </select>
          <select
            value={draftFilters.active}
            onChange={(e) => setDraftFilter('active', e.target.value)}
            className="ac-input !w-auto"
          >
            <option value="all">すべての状態</option>
            <option value="active">有効</option>
            <option value="inactive">無効</option>
          </select>
          <button onClick={handleSearch} className="ac-btn-secondary !px-4 !py-2 text-sm">
            検索
          </button>
          <button onClick={handleClear} className="ac-btn-ghost !px-4 !py-2 text-sm">
            クリア
          </button>
          <button onClick={() => setFormMode('create')} className="ac-btn-primary !px-4 !py-2 text-sm">
            新規登録
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingText className="text-sm font-bold text-wood-400" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-y-2 text-sm">
            <thead>
              <tr className="text-left text-xs font-bold uppercase tracking-wide text-wood-500">
                <SortableHeader
                  label="メール"
                  sortKey="email"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="名前"
                  sortKey="name"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="ロール"
                  sortKey="role"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                />
                <th className="px-4 py-2">状態</th>
                <th className="px-4 py-2">アクション</th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.map((u) => (
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
              {visibleUsers.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="rounded-2xl border-2 border-wood-200 bg-sand-50 px-4 py-6 text-center text-wood-400"
                  >
                    {users.length === 0 ? 'ユーザがいません' : '検索条件に一致するユーザがいません'}
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
