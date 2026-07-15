# マスタ画面 検索・絞り込み・ソート機能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 店舗マスタ（`StoreManagementPanel`）・ユーザーマスタ（`UserManagementPanel`）・店舗一覧（`StoresPage`）の3画面に、クライアント側で完結する検索・絞り込み・ソート機能を追加する。

**Architecture:** 各画面は初回のみ一覧をAPIから取得し、以降の検索・絞り込み・ソートはブラウザ側の `useMemo` で完結させる（`src/pages/LikesListPage.tsx` の既存パターンを踏襲）。テーブル形式の2画面（店舗マスタ・ユーザーマスタ）はヘッダークリックでソートする共通コンポーネント `SortableHeader` を新設して共用し、カード一覧の店舗一覧はプルダウン方式のソートを用いる。

**Tech Stack:** React 18 + TypeScript（strict）、Tailwind CSS、Jest + @testing-library/react（jsdom）。

## Global Constraints

- TypeScript strict mode、`any` 型は使用しない（既存プロジェクト設定に準拠）
- ESLint max 0 warnings（`npm run lint` で警告0件を維持）
- コードスタイルはセミコロンなし・シングルクォート（既存ファイルに合わせる）
- コメントは非自明なWHYがある場合のみ。WHATの説明コメントは書かない
- 既存のAPIエンドポイント（`server/routes/stores.ts`, `server/routes/users.ts`）は変更しない。今回はフロントエンドのみの変更（`?limit=100` のようなクエリ追加はフロント側の呼び出し変更のみで、サーバーは既存のまま対応可能）
- 検索・絞り込みはボタンなしのリアルタイム反映とする（入力・選択のたびに即時反映）

---

### Task 1: 共通コンポーネント `SortableHeader` の作成

**Files:**
- Create: `src/components/SortableHeader.tsx`
- Test: `tests/unit/sortableHeader.test.tsx`

**Interfaces:**
- Produces: `export type SortDirection = 'asc' | 'desc'` と `export function SortableHeader<K extends string>(props: { label: string; sortKey: K; currentSortKey: K; currentSortDir: SortDirection; onSort: (key: K) => void }): JSX.Element`。`<th>` 要素をレンダリングするため、呼び出し側は `<tr>` の直下に配置する（`<thead><tr>` の中で使用する）。

- [ ] **Step 1: 失敗するテストを書く**

`tests/unit/sortableHeader.test.tsx` を作成する:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { SortableHeader } from '../../src/components/SortableHeader'

describe('SortableHeader', () => {
  it('ラベルを表示し、クリックでonSortをsortKey付きで呼び出す', () => {
    const onSort = jest.fn()
    render(
      <table>
        <thead>
          <tr>
            <SortableHeader
              label="名前"
              sortKey="name"
              currentSortKey="category"
              currentSortDir="asc"
              onSort={onSort}
            />
          </tr>
        </thead>
      </table>
    )

    fireEvent.click(screen.getByRole('button', { name: /名前/ }))
    expect(onSort).toHaveBeenCalledWith('name')
  })

  it('アクティブな列は昇順で▲、降順で▼を表示する', () => {
    const { rerender } = render(
      <table>
        <thead>
          <tr>
            <SortableHeader
              label="名前"
              sortKey="name"
              currentSortKey="name"
              currentSortDir="asc"
              onSort={jest.fn()}
            />
          </tr>
        </thead>
      </table>
    )
    expect(screen.getByRole('button', { name: /名前/ }).textContent).toContain('▲')

    rerender(
      <table>
        <thead>
          <tr>
            <SortableHeader
              label="名前"
              sortKey="name"
              currentSortKey="name"
              currentSortDir="desc"
              onSort={jest.fn()}
            />
          </tr>
        </thead>
      </table>
    )
    expect(screen.getByRole('button', { name: /名前/ }).textContent).toContain('▼')
  })

  it('アクティブでない列には矢印を表示しない', () => {
    render(
      <table>
        <thead>
          <tr>
            <SortableHeader
              label="名前"
              sortKey="name"
              currentSortKey="category"
              currentSortDir="asc"
              onSort={jest.fn()}
            />
          </tr>
        </thead>
      </table>
    )
    expect(screen.getByRole('button', { name: /名前/ }).textContent).toBe('名前')
  })
})
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npx jest tests/unit/sortableHeader.test.tsx`
Expected: FAIL（`Cannot find module '../../src/components/SortableHeader'`）

- [ ] **Step 3: 最小実装を書く**

`src/components/SortableHeader.tsx` を作成する:

```tsx
export type SortDirection = 'asc' | 'desc'

interface SortableHeaderProps<K extends string> {
  label: string
  sortKey: K
  currentSortKey: K
  currentSortDir: SortDirection
  onSort: (key: K) => void
}

export function SortableHeader<K extends string>({
  label,
  sortKey,
  currentSortKey,
  currentSortDir,
  onSort,
}: SortableHeaderProps<K>) {
  const isActive = currentSortKey === sortKey
  const arrow = isActive ? (currentSortDir === 'asc' ? '▲' : '▼') : ''

  return (
    <th className="px-4 py-2 text-left font-medium text-gray-600">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="flex items-center gap-1 hover:text-gray-900"
      >
        {label}
        <span className="text-xs">{arrow}</span>
      </button>
    </th>
  )
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `npx jest tests/unit/sortableHeader.test.tsx`
Expected: PASS（3件）

- [ ] **Step 5: コミット**

```bash
git add src/components/SortableHeader.tsx tests/unit/sortableHeader.test.tsx
git commit -m "feat: テーブルヘッダーソート用の共通コンポーネントSortableHeaderを追加"
```

---

### Task 2: 店舗マスタ（`StoreManagementPanel`）に検索・絞り込み・ソートを追加

**Files:**
- Modify: `src/components/StoreManagementPanel.tsx`（全体を置き換え）
- Test: `tests/unit/storeManagementPanel.test.tsx`

**Interfaces:**
- Consumes: Task 1 の `SortableHeader<K extends string>` と `SortDirection`（`src/components/SortableHeader.tsx` から import）

- [ ] **Step 1: 失敗するテストを書く**

`tests/unit/storeManagementPanel.test.tsx` を作成する:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { StoreManagementPanel } from '../../src/components/StoreManagementPanel'
import { api } from '../../src/lib/api'

const mockGet = api.get as jest.Mock

const STORES = [
  { id: 's1', name: 'Charlie', category: 'Bakery', x: 0, y: 0, open_time: '10:00', close_time: '18:00', price_min: null, price_max: null },
  { id: 's2', name: 'Alpha', category: 'Sushi', x: 0, y: 0, open_time: '11:00', close_time: '22:00', price_min: null, price_max: null },
  { id: 's3', name: 'Bravo', category: 'Bakery', x: 0, y: 0, open_time: '08:00', close_time: '20:00', price_min: null, price_max: null },
]

function setup() {
  mockGet.mockResolvedValue({ data: STORES })
  render(<StoreManagementPanel onNotify={jest.fn()} />)
}

beforeEach(() => {
  mockGet.mockReset()
})

describe('StoreManagementPanel 検索・絞り込み・ソート', () => {
  it('店舗名で部分一致検索できる', async () => {
    setup()
    await screen.findByText('Charlie')

    fireEvent.change(screen.getByPlaceholderText('店舗名で検索'), { target: { value: 'al' } })

    expect(screen.getByText('Alpha')).toBeTruthy()
    expect(screen.queryByText('Charlie')).toBeNull()
    expect(screen.queryByText('Bravo')).toBeNull()
  })

  it('カテゴリで絞り込みできる', async () => {
    setup()
    await screen.findByText('Charlie')

    fireEvent.change(screen.getByDisplayValue('すべてのカテゴリ'), { target: { value: 'Sushi' } })

    expect(screen.getByText('Alpha')).toBeTruthy()
    expect(screen.queryByText('Charlie')).toBeNull()
    expect(screen.queryByText('Bravo')).toBeNull()
  })

  it('ヘッダークリックで名前順の昇順・降順を切り替えられる', async () => {
    setup()
    await screen.findByText('Charlie')

    const bodyRowNames = () =>
      screen.getAllByRole('row').slice(1).map((row) => row.querySelectorAll('td')[0].textContent)

    expect(bodyRowNames()).toEqual(['Alpha', 'Bravo', 'Charlie'])

    fireEvent.click(screen.getByRole('button', { name: /名前/ }))
    expect(bodyRowNames()).toEqual(['Charlie', 'Bravo', 'Alpha'])

    fireEvent.click(screen.getByRole('button', { name: /名前/ }))
    expect(bodyRowNames()).toEqual(['Alpha', 'Bravo', 'Charlie'])
  })

  it('絞り込み結果が0件のとき専用メッセージを表示する', async () => {
    setup()
    await screen.findByText('Charlie')

    fireEvent.change(screen.getByPlaceholderText('店舗名で検索'), { target: { value: '存在しない店舗名' } })

    expect(await screen.findByText('検索条件に一致する店舗がありません')).toBeTruthy()
  })
})
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npx jest tests/unit/storeManagementPanel.test.tsx`
Expected: FAIL（`店舗名で検索` のプレースホルダーを持つ要素が見つからない、など）

- [ ] **Step 3: 実装する**

`src/components/StoreManagementPanel.tsx` の内容を以下に置き換える:

```tsx
import { useEffect, useMemo, useState } from 'react'
import { api, ApiError } from '../lib/api'
import { AdminStore, StoreForm } from './StoreForm'
import { CrowdAnalyticsDashboard } from './CrowdAnalyticsDashboard'
import { StoreMediaPanel } from './StoreMediaPanel'
import { SortableHeader, SortDirection } from './SortableHeader'

type StoreSortKey = 'name' | 'category' | 'open_time'

export function StoreManagementPanel({
  onNotify,
}: {
  onNotify: (message: string, type?: 'success' | 'error') => void
}) {
  const [stores, setStores] = useState<AdminStore[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortKey, setSortKey] = useState<StoreSortKey>('name')
  const [sortDir, setSortDir] = useState<SortDirection>('asc')
  const [formMode, setFormMode] = useState<'create' | AdminStore | null>(null)
  const [analyticsStore, setAnalyticsStore] = useState<AdminStore | null>(null)
  const [mediaStore, setMediaStore] = useState<AdminStore | null>(null)

  const loadStores = async () => {
    setIsLoading(true)
    try {
      const res = await api.get<{ data: AdminStore[] }>('/api/stores')
      setStores(res.data)
    } catch (err) {
      onNotify(err instanceof ApiError ? err.message : '店舗一覧の取得に失敗しました', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadStores()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      await loadStores()
    } catch (err) {
      onNotify(err instanceof ApiError ? err.message : '保存に失敗しました', 'error')
    }
  }

  const handleDelete = async (store: AdminStore) => {
    if (!confirm(`${store.name} を削除しますか？`)) return
    try {
      await api.delete(`/api/stores/${store.id}`)
      onNotify('店舗を削除しました')
      await loadStores()
    } catch (err) {
      onNotify(err instanceof ApiError ? err.message : '削除に失敗しました', 'error')
    }
  }

  const handleSort = (key: StoreSortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const categories = useMemo(() => Array.from(new Set(stores.map((s) => s.category))), [stores])

  const visibleStores = useMemo(() => {
    const text = searchText.trim().toLowerCase()
    const filtered = stores.filter((s) => {
      const matchesText = text === '' || s.name.toLowerCase().includes(text)
      const matchesCategory = categoryFilter === 'all' || s.category === categoryFilter
      return matchesText && matchesCategory
    })

    const dir = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      if (sortKey === 'open_time') {
        return (a.open_time ?? '').localeCompare(b.open_time ?? '') * dir
      }
      return a[sortKey].localeCompare(b[sortKey], 'ja') * dir
    })
  }, [stores, searchText, categoryFilter, sortKey, sortDir])

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-gray-900">店舗管理</h3>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="店舗名で検索"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="all">すべてのカテゴリ</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
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
                <SortableHeader
                  label="名前"
                  sortKey="name"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="カテゴリ"
                  sortKey="category"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="営業時間"
                  sortKey="open_time"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                />
                <th className="px-4 py-2 text-left font-medium text-gray-600">アクション</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {visibleStores.map((s) => (
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
                      onClick={() => setMediaStore(s)}
                      className="font-medium text-purple-600 hover:underline"
                    >
                      メディア管理
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
              {visibleStores.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                    {stores.length === 0 ? '店舗がありません' : '検索条件に一致する店舗がありません'}
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
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `npx jest tests/unit/storeManagementPanel.test.tsx`
Expected: PASS（4件）

- [ ] **Step 5: コミット**

```bash
git add src/components/StoreManagementPanel.tsx tests/unit/storeManagementPanel.test.tsx
git commit -m "feat: 店舗マスタに検索・絞り込み・ソート機能を追加"
```

---

### Task 3: ユーザーマスタ（`UserManagementPanel`）に検索・絞り込み・ソートを追加し、全件取得に修正

**Files:**
- Modify: `src/components/UserManagementPanel.tsx`（全体を置き換え）
- Test: `tests/unit/userManagementPanel.test.tsx`

**Interfaces:**
- Consumes: Task 1 の `SortableHeader<K extends string>` と `SortDirection`

- [ ] **Step 1: 失敗するテストを書く**

`tests/unit/userManagementPanel.test.tsx` を作成する:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { UserManagementPanel } from '../../src/components/UserManagementPanel'
import { api } from '../../src/lib/api'

const mockGet = api.get as jest.Mock

const USERS = [
  { id: 'u1', email: 'charlie@example.com', name: 'Charlie', role: 'user' as const, store_id: null, is_active: true },
  { id: 'u2', email: 'alpha@example.com', name: 'Alpha', role: 'admin' as const, store_id: null, is_active: true },
  { id: 'u3', email: 'bravo@example.com', name: 'Bravo', role: 'store_manager' as const, store_id: null, is_active: false },
]

function setup() {
  mockGet.mockResolvedValue({ data: USERS })
  render(<UserManagementPanel onNotify={jest.fn()} />)
}

beforeEach(() => {
  mockGet.mockReset()
})

describe('UserManagementPanel 検索・絞り込み・ソート', () => {
  it('全件取得のためlimit=100を指定して取得する', async () => {
    setup()
    await screen.findByText('Charlie')

    expect(mockGet).toHaveBeenCalledWith('/api/users?limit=100')
  })

  it('名前またはメールで部分一致検索できる', async () => {
    setup()
    await screen.findByText('Charlie')

    fireEvent.change(screen.getByPlaceholderText('名前・メールで検索'), { target: { value: 'al' } })

    expect(screen.getByText('Alpha')).toBeTruthy()
    expect(screen.queryByText('Charlie')).toBeNull()
    expect(screen.queryByText('Bravo')).toBeNull()
  })

  it('ロールで絞り込みできる', async () => {
    setup()
    await screen.findByText('Charlie')

    fireEvent.change(screen.getByDisplayValue('すべてのロール'), { target: { value: 'admin' } })

    expect(screen.getByText('Alpha')).toBeTruthy()
    expect(screen.queryByText('Charlie')).toBeNull()
    expect(screen.queryByText('Bravo')).toBeNull()
  })

  it('有効/無効で絞り込みできる', async () => {
    setup()
    await screen.findByText('Charlie')

    fireEvent.change(screen.getByDisplayValue('すべての状態'), { target: { value: 'inactive' } })

    expect(screen.getByText('Bravo')).toBeTruthy()
    expect(screen.queryByText('Charlie')).toBeNull()
    expect(screen.queryByText('Alpha')).toBeNull()
  })

  it('ヘッダークリックで名前順の昇順・降順を切り替えられる', async () => {
    setup()
    await screen.findByText('Charlie')

    const bodyRowNames = () =>
      screen.getAllByRole('row').slice(1).map((row) => row.querySelectorAll('td')[1].textContent)

    expect(bodyRowNames()).toEqual(['Alpha', 'Bravo', 'Charlie'])

    fireEvent.click(screen.getByRole('button', { name: /名前/ }))
    expect(bodyRowNames()).toEqual(['Charlie', 'Bravo', 'Alpha'])
  })

  it('絞り込み結果が0件のとき専用メッセージを表示する', async () => {
    setup()
    await screen.findByText('Charlie')

    fireEvent.change(screen.getByPlaceholderText('名前・メールで検索'), { target: { value: '存在しないユーザー名' } })

    expect(await screen.findByText('検索条件に一致するユーザがいません')).toBeTruthy()
  })
})
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npx jest tests/unit/userManagementPanel.test.tsx`
Expected: FAIL（`名前・メールで検索` のプレースホルダーを持つ要素が見つからない、`mockGet` が `/api/users` で呼ばれ `/api/users?limit=100` ではない、など）

- [ ] **Step 3: 実装する**

`src/components/UserManagementPanel.tsx` の内容を以下に置き換える:

```tsx
import { useEffect, useMemo, useState } from 'react'
import { api, ApiError } from '../lib/api'
import { AdminUser, UserForm, UserFormValues } from './UserForm'
import { SortableHeader, SortDirection } from './SortableHeader'

type UserSortKey = 'email' | 'name' | 'role'
type ActiveFilter = 'all' | 'active' | 'inactive'
type RoleFilter = 'all' | AdminUser['role']

export function UserManagementPanel({
  onNotify,
}: {
  onNotify: (message: string, type?: 'success' | 'error') => void
}) {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all')
  const [sortKey, setSortKey] = useState<UserSortKey>('name')
  const [sortDir, setSortDir] = useState<SortDirection>('asc')
  const [formMode, setFormMode] = useState<'create' | AdminUser | null>(null)

  const loadUsers = async () => {
    setIsLoading(true)
    try {
      const res = await api.get<{ data: AdminUser[] }>('/api/users?limit=100')
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

  const handleSort = (key: UserSortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const visibleUsers = useMemo(() => {
    const text = searchText.trim().toLowerCase()
    const filtered = users.filter((u) => {
      const matchesText =
        text === '' || u.name.toLowerCase().includes(text) || u.email.toLowerCase().includes(text)
      const matchesRole = roleFilter === 'all' || u.role === roleFilter
      const matchesActive =
        activeFilter === 'all' || (activeFilter === 'active' ? u.is_active : !u.is_active)
      return matchesText && matchesRole && matchesActive
    })

    const dir = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => a[sortKey].localeCompare(b[sortKey], 'ja') * dir)
  }, [users, searchText, roleFilter, activeFilter, sortKey, sortDir])

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-gray-900">ユーザ管理</h3>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="名前・メールで検索"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="all">すべてのロール</option>
            <option value="admin">admin</option>
            <option value="store_manager">store_manager</option>
            <option value="user">user</option>
          </select>
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as ActiveFilter)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="all">すべての状態</option>
            <option value="active">有効</option>
            <option value="inactive">無効</option>
          </select>
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
                <th className="px-4 py-2 text-left font-medium text-gray-600">状態</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">アクション</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {visibleUsers.map((u) => (
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
              {visibleUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
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
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `npx jest tests/unit/userManagementPanel.test.tsx`
Expected: PASS（6件）

- [ ] **Step 5: コミット**

```bash
git add src/components/UserManagementPanel.tsx tests/unit/userManagementPanel.test.tsx
git commit -m "fix: ユーザーマスタに検索・絞り込み・ソートを追加し全件取得に修正(limit=100)"
```

---

### Task 4: 店舗一覧（`StoresPage`）に検索・絞り込み・ソートを追加

**Files:**
- Modify: `src/pages/StoresPage.tsx`（全体を置き換え）
- Test: `tests/unit/storesPage.test.tsx`

**Interfaces:**
- Consumes: なし（`LikesListPage.tsx` のプルダウン方式を参考にした独立実装）

- [ ] **Step 1: 失敗するテストを書く**

`tests/unit/storesPage.test.tsx` を作成する:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import StoresPage from '../../src/pages/StoresPage'
import { AuthContext } from '../../src/context/AuthContext'
import { api } from '../../src/lib/api'

const mockGet = api.get as jest.Mock

const STORES = [
  { id: 's1', name: 'Charlie', category: 'Bakery', x: 0, y: 0, open_time: '10:00', close_time: '18:00', price_min: null, price_max: null },
  { id: 's2', name: 'Alpha', category: 'Sushi', x: 0, y: 0, open_time: '11:00', close_time: '22:00', price_min: null, price_max: null },
  { id: 's3', name: 'Bravo', category: 'Bakery', x: 0, y: 0, open_time: '08:00', close_time: '20:00', price_min: null, price_max: null },
]

function setup() {
  mockGet.mockImplementation((path: string) => {
    if (path === '/api/stores') return Promise.resolve({ data: STORES })
    if (path.includes('/likes/count')) return Promise.resolve({ count: 0 })
    return Promise.reject(new Error(`unexpected path: ${path}`))
  })

  const authValue = {
    user: null,
    permissions: [],
    isLoading: false,
    login: jest.fn(),
    logout: jest.fn(),
    isAuthenticated: false,
    hasPermission: () => false,
  }

  render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter>
        <StoresPage />
      </MemoryRouter>
    </AuthContext.Provider>
  )
}

beforeEach(() => {
  mockGet.mockReset()
})

describe('StoresPage 検索・絞り込み・ソート', () => {
  it('店舗名で部分一致検索できる', async () => {
    setup()
    await screen.findByText('Charlie')

    fireEvent.change(screen.getByPlaceholderText('店舗名で検索'), { target: { value: 'al' } })

    expect(screen.getByText('Alpha')).toBeTruthy()
    expect(screen.queryByText('Charlie')).toBeNull()
    expect(screen.queryByText('Bravo')).toBeNull()
  })

  it('カテゴリで絞り込みできる', async () => {
    setup()
    await screen.findByText('Charlie')

    fireEvent.change(screen.getByDisplayValue('すべてのカテゴリ'), { target: { value: 'Sushi' } })

    expect(screen.getByText('Alpha')).toBeTruthy()
    expect(screen.queryByText('Charlie')).toBeNull()
    expect(screen.queryByText('Bravo')).toBeNull()
  })

  it('カテゴリ順で並び替えると同カテゴリ内は店舗名順になる', async () => {
    setup()
    await screen.findByText('Charlie')

    fireEvent.change(screen.getByDisplayValue('店舗名順'), { target: { value: 'category' } })

    const names = Array.from(document.querySelectorAll('[data-testid="store-item"] p.font-medium')).map(
      (el) => el.textContent
    )
    expect(names).toEqual(['Bravo', 'Charlie', 'Alpha'])
  })

  it('絞り込み結果が0件のとき専用メッセージを表示する', async () => {
    setup()
    await screen.findByText('Charlie')

    fireEvent.change(screen.getByPlaceholderText('店舗名で検索'), { target: { value: '存在しない店舗名' } })

    expect(await screen.findByText('検索条件に一致する店舗がありません')).toBeTruthy()
  })
})
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npx jest tests/unit/storesPage.test.tsx`
Expected: FAIL（`店舗名で検索` のプレースホルダーを持つ要素が見つからない、など）

- [ ] **Step 3: 実装する**

`src/pages/StoresPage.tsx` の内容を以下に置き換える:

```tsx
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api, ApiError } from '../lib/api'
import { getStoreLikeCount } from '../lib/likes'
import LikeButton from '../components/LikeButton'
import ReservationModal from '../components/ReservationModal'
import type { AdminStore } from '../components/StoreForm'

type SortKey = 'name' | 'category'

export default function StoresPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [stores, setStores] = useState<AdminStore[]>([])
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reservingStore, setReservingStore] = useState<AdminStore | null>(null)
  const [searchText, setSearchText] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortKey, setSortKey] = useState<SortKey>('name')

  useEffect(() => {
    api
      .get<{ data: AdminStore[] }>('/api/stores')
      .then(async (res) => {
        setStores(res.data)
        const counts = await Promise.all(res.data.map((store) => getStoreLikeCount(store.id)))
        setLikeCounts(Object.fromEntries(res.data.map((store, i) => [store.id, counts[i].count])))
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : '店舗一覧の取得に失敗しました'))
      .finally(() => setIsLoading(false))
  }, [])

  const categories = useMemo(() => Array.from(new Set(stores.map((s) => s.category))), [stores])

  const visibleStores = useMemo(() => {
    const text = searchText.trim().toLowerCase()
    const filtered = stores.filter((s) => {
      const matchesText = text === '' || s.name.toLowerCase().includes(text)
      const matchesCategory = categoryFilter === 'all' || s.category === categoryFilter
      return matchesText && matchesCategory
    })

    return [...filtered].sort((a, b) => a[sortKey].localeCompare(b[sortKey], 'ja'))
  }, [stores, searchText, categoryFilter, sortKey])

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
          <h1 className="text-xl font-bold text-gray-900">店舗一覧</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>
        )}

        <div className="flex flex-wrap gap-3 mb-6">
          <input
            type="text"
            placeholder="店舗名で検索"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />

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

          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="name">店舗名順</option>
            <option value="category">カテゴリ順</option>
          </select>
        </div>

        {isLoading ? (
          <p className="text-gray-500 text-sm">読み込み中...</p>
        ) : stores.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">店舗がありません</div>
        ) : visibleStores.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            検索条件に一致する店舗がありません
          </div>
        ) : (
          <ul className="space-y-3">
            {visibleStores.map((store) => (
              <li
                key={store.id}
                data-testid="store-item"
                className="bg-white rounded-lg shadow p-4 flex justify-between items-center"
              >
                <button
                  type="button"
                  onClick={() => navigate(`/stores/${store.id}`)}
                  className="text-left"
                >
                  <p className="font-medium text-gray-900 hover:underline">{store.name}</p>
                  <p className="text-xs text-gray-500">
                    {store.category}
                    {store.open_time && store.close_time && ` ・ ${store.open_time} - ${store.close_time}`}
                  </p>
                </button>
                <div className="flex items-center gap-3">
                  {user && <LikeButton userId={user.id} storeId={store.id} initialCount={likeCounts[store.id] ?? 0} />}
                  <button
                    type="button"
                    onClick={() => setReservingStore(store)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
                  >
                    座席予約
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      {reservingStore && (
        <ReservationModal
          isOpen
          onClose={() => setReservingStore(null)}
          storeId={reservingStore.id}
          storeName={reservingStore.name}
          openTime={reservingStore.open_time}
          closeTime={reservingStore.close_time}
          onViewReservations={() => navigate('/reservations')}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `npx jest tests/unit/storesPage.test.tsx`
Expected: PASS（4件）

- [ ] **Step 5: コミット**

```bash
git add src/pages/StoresPage.tsx tests/unit/storesPage.test.tsx
git commit -m "feat: 店舗一覧に検索・絞り込み・ソート機能を追加"
```

---

### Task 5: 最終確認

**Files:** なし（検証のみ）

**Interfaces:** なし

- [ ] **Step 1: Lintを実行する**

Run: `npm run lint`
Expected: 警告0件・エラー0件で終了

- [ ] **Step 2: 型チェックを実行する**

Run: `npm run build && npm run typecheck`
Expected: エラーなく完了

- [ ] **Step 3: テストスイート全体を実行する**

Run: `npm test`
Expected: 追加した4ファイル（`sortableHeader.test.tsx`, `storeManagementPanel.test.tsx`, `userManagementPanel.test.tsx`, `storesPage.test.tsx`）を含め全件PASS。既存テストにも regression がないことを確認する

- [ ] **Step 4: 最終コミット（差分がある場合のみ）**

Lintやtypecheckの指摘で修正が発生した場合は、該当ファイルを追加してコミットする:

```bash
git add -A
git commit -m "fix: lint/typecheckの指摘を修正"
```
