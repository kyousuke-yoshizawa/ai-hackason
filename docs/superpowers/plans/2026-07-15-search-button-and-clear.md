# マスタ画面 検索ボタン・クリアボタン化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 店舗マスタ・ユーザーマスタ・店舗一覧の3画面で、テキスト検索・プルダウン絞り込みをリアルタイム反映から「検索」ボタン押下反映に変更し、条件と一覧をリセットする「クリア」ボタンを追加する。

**Architecture:** 各画面の入力状態を「draft（入力欄にバインド）」と「applied（絞り込みの`useMemo`が参照）」の2層に分離する。「検索」ボタンは draft を applied にコピーし、「クリア」ボタンは draft・applied 双方を初期値に戻す。ソート状態は対象外で、これまで通り即時反映のまま単一の state を使う。

**Tech Stack:** React 18 + TypeScript（strict）、Tailwind CSS（`.ac-*` テーマユーティリティ）、Jest + @testing-library/react。

## Global Constraints

- TypeScript strict mode、`any` 型は使用しない
- ESLint max 0 warnings（`npm run lint` で警告0件を維持）
- コードスタイルはセミコロンなし・シングルクォート
- コメントは非自明なWHYがある場合のみ
- 「検索」ボタンは `ac-btn-secondary`、「クリア」ボタンは `ac-btn-ghost`（`src/index.css` 定義済み）を使用し、「新規登録」（`ac-btn-primary`）とは別の見た目にする
- ソート（テーブルヘッダークリック、店舗一覧のプルダウン）は変更しない。即時反映のまま
- テキスト検索欄でのEnterキーによる検索実行は実装しない（ボタンクリックのみ）
- 「検索」ボタンの活性・非活性制御は行わない（常に押下可能）
- バックエンド・APIエンドポイントは変更しない（フロントエンドのみの変更）

---

### Task 1: 店舗マスタ（StoreManagementPanel）を検索ボタン・クリアボタン化

**Files:**
- Modify: `src/components/StoreManagementPanel.tsx`（全体を置き換え）
- Test: `tests/unit/storeManagementPanel.test.tsx`（全体を置き換え）

**Interfaces:**
- Consumes: 既存の `SortableColumnLabel`／`SortDirection`（`src/components/SortableHeader.tsx`、変更なし）
- Produces: なし（他タスクから参照されない）

- [ ] **Step 1: 失敗するテストを書く**

`tests/unit/storeManagementPanel.test.tsx` の内容を以下に置き換える:

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
  it('検索ボタンを押すまでは一覧が変化しない', async () => {
    setup()
    await screen.findByText('Charlie')

    fireEvent.change(screen.getByPlaceholderText('店舗名で検索'), { target: { value: 'al' } })

    expect(screen.getByText('Charlie')).toBeTruthy()
    expect(screen.getByText('Alpha')).toBeTruthy()
    expect(screen.getByText('Bravo')).toBeTruthy()
  })

  it('検索ボタンを押すと店舗名の部分一致で絞り込まれる', async () => {
    setup()
    await screen.findByText('Charlie')

    fireEvent.change(screen.getByPlaceholderText('店舗名で検索'), { target: { value: 'al' } })
    fireEvent.click(screen.getByRole('button', { name: '検索' }))

    expect(screen.getByText('Alpha')).toBeTruthy()
    expect(screen.queryByText('Charlie')).toBeNull()
    expect(screen.queryByText('Bravo')).toBeNull()
  })

  it('検索ボタンを押すとカテゴリで絞り込まれる', async () => {
    setup()
    await screen.findByText('Charlie')

    fireEvent.change(screen.getByDisplayValue('すべてのカテゴリ'), { target: { value: 'Sushi' } })
    fireEvent.click(screen.getByRole('button', { name: '検索' }))

    expect(screen.getByText('Alpha')).toBeTruthy()
    expect(screen.queryByText('Charlie')).toBeNull()
    expect(screen.queryByText('Bravo')).toBeNull()
  })

  it('クリアボタンで検索条件と一覧表示が初期状態に戻る', async () => {
    setup()
    await screen.findByText('Charlie')

    fireEvent.change(screen.getByPlaceholderText('店舗名で検索'), { target: { value: 'al' } })
    fireEvent.click(screen.getByRole('button', { name: '検索' }))
    expect(screen.queryByText('Charlie')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'クリア' }))

    expect(screen.getByPlaceholderText('店舗名で検索')).toHaveValue('')
    expect(screen.getByDisplayValue('すべてのカテゴリ')).toBeTruthy()
    expect(screen.getByText('Charlie')).toBeTruthy()
    expect(screen.getByText('Alpha')).toBeTruthy()
    expect(screen.getByText('Bravo')).toBeTruthy()
  })

  it('ヘッダークリックで名前順の昇順・降順を切り替えられる', async () => {
    setup()
    await screen.findByText('Charlie')

    const bodyRowNames = () =>
      screen
        .getAllByTestId('store-row')
        .map((row) => row.querySelector('p.font-bold')?.textContent)

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
    fireEvent.click(screen.getByRole('button', { name: '検索' }))

    expect(await screen.findByText('検索条件に一致する店舗がありません')).toBeTruthy()
  })

  it('カテゴリ順ソート時、同カテゴリ内は名前順（タイブレーク）になる', async () => {
    setup()
    await screen.findByText('Charlie')

    const bodyRowNames = () =>
      screen
        .getAllByTestId('store-row')
        .map((row) => row.querySelector('p.font-bold')?.textContent)

    fireEvent.click(screen.getByRole('button', { name: /カテゴリ/ }))

    expect(bodyRowNames()).toEqual(['Bravo', 'Charlie', 'Alpha'])
  })
})
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npx jest tests/unit/storeManagementPanel.test.tsx`
Expected: FAIL（「検索ボタンを押すまでは一覧が変化しない」以外の新規テストで `getByRole('button', { name: '検索' })` が見つからない、など）

- [ ] **Step 3: 実装する**

`src/components/StoreManagementPanel.tsx` の内容を以下に置き換える:

```tsx
import { useEffect, useMemo, useState } from 'react'
import { api, ApiError } from '../lib/api'
import { AdminStore, StoreForm } from './StoreForm'
import { CrowdAnalyticsDashboard } from './CrowdAnalyticsDashboard'
import { StoreMediaPanel } from './StoreMediaPanel'
import { SortableColumnLabel, SortDirection } from './SortableHeader'

type StoreSortKey = 'name' | 'category' | 'open_time'

export function StoreManagementPanel({
  onNotify,
}: {
  onNotify: (message: string, type?: 'success' | 'error') => void
}) {
  const [stores, setStores] = useState<AdminStore[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [draftSearchText, setDraftSearchText] = useState('')
  const [draftCategoryFilter, setDraftCategoryFilter] = useState('all')
  const [appliedSearchText, setAppliedSearchText] = useState('')
  const [appliedCategoryFilter, setAppliedCategoryFilter] = useState('all')
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

  const handleSearch = () => {
    setAppliedSearchText(draftSearchText)
    setAppliedCategoryFilter(draftCategoryFilter)
  }

  const handleClear = () => {
    setDraftSearchText('')
    setDraftCategoryFilter('all')
    setAppliedSearchText('')
    setAppliedCategoryFilter('all')
  }

  const categories = useMemo(() => Array.from(new Set(stores.map((s) => s.category))), [stores])

  const visibleStores = useMemo(() => {
    const text = appliedSearchText.trim().toLowerCase()
    const filtered = stores.filter((s) => {
      const matchesText = text === '' || s.name.toLowerCase().includes(text)
      const matchesCategory = appliedCategoryFilter === 'all' || s.category === appliedCategoryFilter
      return matchesText && matchesCategory
    })

    const dir = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      const primary =
        sortKey === 'open_time'
          ? (a.open_time ?? '').localeCompare(b.open_time ?? '')
          : a[sortKey].localeCompare(b[sortKey], 'ja')
      if (primary !== 0) return primary * dir
      return sortKey === 'name' ? 0 : a.name.localeCompare(b.name, 'ja')
    })
  }, [stores, appliedSearchText, appliedCategoryFilter, sortKey, sortDir])

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-extrabold text-wood-800">🏬 店舗管理</h3>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="店舗名で検索"
            value={draftSearchText}
            onChange={(e) => setDraftSearchText(e.target.value)}
            className="ac-input !w-auto"
          />
          <select
            value={draftCategoryFilter}
            onChange={(e) => setDraftCategoryFilter(e.target.value)}
            className="ac-input !w-auto"
          >
            <option value="all">すべてのカテゴリ</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button onClick={handleSearch} className="ac-btn-secondary">
            検索
          </button>
          <button onClick={handleClear} className="ac-btn-ghost">
            クリア
          </button>
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
            <SortableColumnLabel
              label="名前"
              sortKey="name"
              currentSortKey={sortKey}
              currentSortDir={sortDir}
              onSort={handleSort}
            />
            <SortableColumnLabel
              label="カテゴリ"
              sortKey="category"
              currentSortKey={sortKey}
              currentSortDir={sortDir}
              onSort={handleSort}
            />
            <SortableColumnLabel
              label="営業時間"
              sortKey="open_time"
              currentSortKey={sortKey}
              currentSortDir={sortDir}
              onSort={handleSort}
            />
            <span>アクション</span>
          </div>
          {visibleStores.map((s) => (
            <div
              key={s.id}
              data-testid="store-row"
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
          {visibleStores.length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-wood-200 bg-sand-50/60 px-4 py-6 text-center text-wood-400">
              {stores.length === 0 ? '店舗がありません' : '検索条件に一致する店舗がありません'}
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
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `npx jest tests/unit/storeManagementPanel.test.tsx`
Expected: PASS（7件）

- [ ] **Step 5: コミット**

```bash
git add src/components/StoreManagementPanel.tsx tests/unit/storeManagementPanel.test.tsx
git commit -m "feat: 店舗マスタの検索・絞り込みを検索ボタン方式にしクリアボタンを追加"
```

---

### Task 2: ユーザーマスタ（UserManagementPanel）を検索ボタン・クリアボタン化

**Files:**
- Modify: `src/components/UserManagementPanel.tsx`（全体を置き換え）
- Test: `tests/unit/userManagementPanel.test.tsx`（全体を置き換え）

**Interfaces:**
- Consumes: 既存の `SortableHeader`／`SortDirection`（`src/components/SortableHeader.tsx`、変更なし）
- Produces: なし

- [ ] **Step 1: 失敗するテストを書く**

`tests/unit/userManagementPanel.test.tsx` の内容を以下に置き換える:

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

  it('検索ボタンを押すまでは一覧が変化しない', async () => {
    setup()
    await screen.findByText('Charlie')

    fireEvent.change(screen.getByPlaceholderText('名前・メールで検索'), { target: { value: 'al' } })

    expect(screen.getByText('Charlie')).toBeTruthy()
    expect(screen.getByText('Alpha')).toBeTruthy()
    expect(screen.getByText('Bravo')).toBeTruthy()
  })

  it('検索ボタンを押すと名前またはメールの部分一致で絞り込まれる', async () => {
    setup()
    await screen.findByText('Charlie')

    fireEvent.change(screen.getByPlaceholderText('名前・メールで検索'), { target: { value: 'al' } })
    fireEvent.click(screen.getByRole('button', { name: '検索' }))

    expect(screen.getByText('Alpha')).toBeTruthy()
    expect(screen.queryByText('Charlie')).toBeNull()
    expect(screen.queryByText('Bravo')).toBeNull()
  })

  it('検索ボタンを押すとロールで絞り込まれる', async () => {
    setup()
    await screen.findByText('Charlie')

    fireEvent.change(screen.getByDisplayValue('すべてのロール'), { target: { value: 'admin' } })
    fireEvent.click(screen.getByRole('button', { name: '検索' }))

    expect(screen.getByText('Alpha')).toBeTruthy()
    expect(screen.queryByText('Charlie')).toBeNull()
    expect(screen.queryByText('Bravo')).toBeNull()
  })

  it('検索ボタンを押すと有効/無効で絞り込まれる', async () => {
    setup()
    await screen.findByText('Charlie')

    fireEvent.change(screen.getByDisplayValue('すべての状態'), { target: { value: 'inactive' } })
    fireEvent.click(screen.getByRole('button', { name: '検索' }))

    expect(screen.getByText('Bravo')).toBeTruthy()
    expect(screen.queryByText('Charlie')).toBeNull()
    expect(screen.queryByText('Alpha')).toBeNull()
  })

  it('クリアボタンで検索条件と一覧表示が初期状態に戻る', async () => {
    setup()
    await screen.findByText('Charlie')

    fireEvent.change(screen.getByPlaceholderText('名前・メールで検索'), { target: { value: 'al' } })
    fireEvent.change(screen.getByDisplayValue('すべてのロール'), { target: { value: 'admin' } })
    fireEvent.click(screen.getByRole('button', { name: '検索' }))
    expect(screen.queryByText('Charlie')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'クリア' }))

    expect(screen.getByPlaceholderText('名前・メールで検索')).toHaveValue('')
    expect(screen.getByDisplayValue('すべてのロール')).toBeTruthy()
    expect(screen.getByDisplayValue('すべての状態')).toBeTruthy()
    expect(screen.getByText('Charlie')).toBeTruthy()
    expect(screen.getByText('Alpha')).toBeTruthy()
    expect(screen.getByText('Bravo')).toBeTruthy()
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
    fireEvent.click(screen.getByRole('button', { name: '検索' }))

    expect(await screen.findByText('検索条件に一致するユーザがいません')).toBeTruthy()
  })

  it('ロール順ソート時、同ロール内は名前順（タイブレーク）になる', async () => {
    const TIED_ROLE_USERS = [
      { id: 'u1', email: 'charlie@example.com', name: 'Charlie', role: 'user' as const, store_id: null, is_active: true },
      { id: 'u2', email: 'alpha@example.com', name: 'Alpha', role: 'user' as const, store_id: null, is_active: true },
      { id: 'u3', email: 'bravo@example.com', name: 'Bravo', role: 'admin' as const, store_id: null, is_active: true },
    ]
    mockGet.mockResolvedValue({ data: TIED_ROLE_USERS })
    render(<UserManagementPanel onNotify={jest.fn()} />)
    await screen.findByText('Charlie')

    fireEvent.click(screen.getByRole('button', { name: /ロール/ }))

    const bodyRowNames = () =>
      screen.getAllByRole('row').slice(1).map((row) => row.querySelectorAll('td')[1].textContent)

    expect(bodyRowNames()).toEqual(['Bravo', 'Alpha', 'Charlie'])
  })
})
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npx jest tests/unit/userManagementPanel.test.tsx`
Expected: FAIL（`getByRole('button', { name: '検索' })` / `{ name: 'クリア' }` が見つからない、など）

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
  const [draftSearchText, setDraftSearchText] = useState('')
  const [draftRoleFilter, setDraftRoleFilter] = useState<RoleFilter>('all')
  const [draftActiveFilter, setDraftActiveFilter] = useState<ActiveFilter>('all')
  const [appliedSearchText, setAppliedSearchText] = useState('')
  const [appliedRoleFilter, setAppliedRoleFilter] = useState<RoleFilter>('all')
  const [appliedActiveFilter, setAppliedActiveFilter] = useState<ActiveFilter>('all')
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

  const handleSearch = () => {
    setAppliedSearchText(draftSearchText)
    setAppliedRoleFilter(draftRoleFilter)
    setAppliedActiveFilter(draftActiveFilter)
  }

  const handleClear = () => {
    setDraftSearchText('')
    setDraftRoleFilter('all')
    setDraftActiveFilter('all')
    setAppliedSearchText('')
    setAppliedRoleFilter('all')
    setAppliedActiveFilter('all')
  }

  const visibleUsers = useMemo(() => {
    const text = appliedSearchText.trim().toLowerCase()
    const filtered = users.filter((u) => {
      const matchesText =
        text === '' || u.name.toLowerCase().includes(text) || u.email.toLowerCase().includes(text)
      const matchesRole = appliedRoleFilter === 'all' || u.role === appliedRoleFilter
      const matchesActive =
        appliedActiveFilter === 'all' || (appliedActiveFilter === 'active' ? u.is_active : !u.is_active)
      return matchesText && matchesRole && matchesActive
    })

    const dir = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      const primary = a[sortKey].localeCompare(b[sortKey], 'ja')
      if (primary !== 0) return primary * dir
      return sortKey === 'name' ? 0 : a.name.localeCompare(b.name, 'ja')
    })
  }, [users, appliedSearchText, appliedRoleFilter, appliedActiveFilter, sortKey, sortDir])

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
            value={draftRoleFilter}
            onChange={(e) => setDraftRoleFilter(e.target.value as RoleFilter)}
            className="ac-input !w-auto"
          >
            <option value="all">すべてのロール</option>
            <option value="admin">admin</option>
            <option value="store_manager">store_manager</option>
            <option value="user">user</option>
          </select>
          <select
            value={draftActiveFilter}
            onChange={(e) => setDraftActiveFilter(e.target.value as ActiveFilter)}
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
        <p className="text-sm font-bold text-wood-400">読み込み中...</p>
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
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `npx jest tests/unit/userManagementPanel.test.tsx`
Expected: PASS（9件）

- [ ] **Step 5: コミット**

```bash
git add src/components/UserManagementPanel.tsx tests/unit/userManagementPanel.test.tsx
git commit -m "feat: ユーザーマスタの検索・絞り込みを検索ボタン方式にしクリアボタンを追加"
```

---

### Task 3: 店舗一覧（StoresPage）を検索ボタン・クリアボタン化

**Files:**
- Modify: `src/pages/StoresPage.tsx`（全体を置き換え）
- Test: `tests/unit/storesPage.test.tsx`（全体を置き換え）

**Interfaces:**
- Consumes: なし
- Produces: なし

- [ ] **Step 1: 失敗するテストを書く**

`tests/unit/storesPage.test.tsx` の内容を以下に置き換える:

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
  it('検索ボタンを押すまでは一覧が変化しない', async () => {
    setup()
    await screen.findByText('Charlie')

    fireEvent.change(screen.getByPlaceholderText('店舗名で検索'), { target: { value: 'al' } })

    expect(screen.getByText('Charlie')).toBeTruthy()
    expect(screen.getByText('Alpha')).toBeTruthy()
    expect(screen.getByText('Bravo')).toBeTruthy()
  })

  it('検索ボタンを押すと店舗名の部分一致で絞り込まれる', async () => {
    setup()
    await screen.findByText('Charlie')

    fireEvent.change(screen.getByPlaceholderText('店舗名で検索'), { target: { value: 'al' } })
    fireEvent.click(screen.getByRole('button', { name: '検索' }))

    expect(screen.getByText('Alpha')).toBeTruthy()
    expect(screen.queryByText('Charlie')).toBeNull()
    expect(screen.queryByText('Bravo')).toBeNull()
  })

  it('検索ボタンを押すとカテゴリで絞り込まれる', async () => {
    setup()
    await screen.findByText('Charlie')

    fireEvent.change(screen.getByDisplayValue('すべてのカテゴリ'), { target: { value: 'Sushi' } })
    fireEvent.click(screen.getByRole('button', { name: '検索' }))

    expect(screen.getByText('Alpha')).toBeTruthy()
    expect(screen.queryByText('Charlie')).toBeNull()
    expect(screen.queryByText('Bravo')).toBeNull()
  })

  it('クリアボタンで検索条件と一覧表示が初期状態に戻る', async () => {
    setup()
    await screen.findByText('Charlie')

    fireEvent.change(screen.getByPlaceholderText('店舗名で検索'), { target: { value: 'al' } })
    fireEvent.click(screen.getByRole('button', { name: '検索' }))
    expect(screen.queryByText('Charlie')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'クリア' }))

    expect(screen.getByPlaceholderText('店舗名で検索')).toHaveValue('')
    expect(screen.getByDisplayValue('すべてのカテゴリ')).toBeTruthy()
    expect(screen.getByText('Charlie')).toBeTruthy()
    expect(screen.getByText('Alpha')).toBeTruthy()
    expect(screen.getByText('Bravo')).toBeTruthy()
  })

  it('カテゴリ順で並び替えると同カテゴリ内は店舗名順になる', async () => {
    setup()
    await screen.findByText('Charlie')

    fireEvent.change(screen.getByDisplayValue('店舗名順'), { target: { value: 'category' } })

    const names = Array.from(document.querySelectorAll('[data-testid="store-item"] p.font-bold')).map(
      (el) => el.textContent
    )
    expect(names).toEqual(['Bravo', 'Charlie', 'Alpha'])
  })

  it('絞り込み結果が0件のとき専用メッセージを表示する', async () => {
    setup()
    await screen.findByText('Charlie')

    fireEvent.change(screen.getByPlaceholderText('店舗名で検索'), { target: { value: '存在しない店舗名' } })
    fireEvent.click(screen.getByRole('button', { name: '検索' }))

    expect(await screen.findByText('検索条件に一致する店舗がありません')).toBeTruthy()
  })
})
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npx jest tests/unit/storesPage.test.tsx`
Expected: FAIL（`getByRole('button', { name: '検索' })` / `{ name: 'クリア' }` が見つからない、など）

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
import Cloud from '../components/decor/Cloud'
import Leaf from '../components/decor/Leaf'
import GrassBorder from '../components/decor/GrassBorder'

type SortKey = 'name' | 'category'

export default function StoresPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [stores, setStores] = useState<AdminStore[]>([])
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reservingStore, setReservingStore] = useState<AdminStore | null>(null)
  const [draftSearchText, setDraftSearchText] = useState('')
  const [draftCategoryFilter, setDraftCategoryFilter] = useState('all')
  const [appliedSearchText, setAppliedSearchText] = useState('')
  const [appliedCategoryFilter, setAppliedCategoryFilter] = useState('all')
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

  const handleSearch = () => {
    setAppliedSearchText(draftSearchText)
    setAppliedCategoryFilter(draftCategoryFilter)
  }

  const handleClear = () => {
    setDraftSearchText('')
    setDraftCategoryFilter('all')
    setAppliedSearchText('')
    setAppliedCategoryFilter('all')
  }

  const visibleStores = useMemo(() => {
    const text = appliedSearchText.trim().toLowerCase()
    const filtered = stores.filter((s) => {
      const matchesText = text === '' || s.name.toLowerCase().includes(text)
      const matchesCategory = appliedCategoryFilter === 'all' || s.category === appliedCategoryFilter
      return matchesText && matchesCategory
    })

    return [...filtered].sort((a, b) => {
      const primary = a[sortKey].localeCompare(b[sortKey], 'ja')
      if (primary !== 0) return primary
      return a.name.localeCompare(b.name, 'ja')
    })
  }, [stores, appliedSearchText, appliedCategoryFilter, sortKey])

  return (
    <div className="ac-page-bg">
      <header className="ac-header relative">
        <Cloud className="absolute right-6 top-2 h-8 w-16 opacity-30" />
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-4">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="ac-btn-ghost !px-3 !py-1.5 text-sm !text-white hover:!bg-white/20"
          >
            ← ダッシュボードに戻る
          </button>
          <h1 className="text-xl font-extrabold">店舗一覧</h1>
        </div>
        <GrassBorder className="absolute -bottom-[5px] left-0 h-2 w-full" color="#eef9ff" />
      </header>

      <main className="relative mx-auto max-w-4xl px-4 py-8">
        {error && (
          <p className="mb-4 rounded-2xl border-2 border-bubble-200 bg-bubble-50 px-4 py-2 text-sm font-bold text-bubble-700">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-3 mb-6">
          <input
            type="text"
            placeholder="店舗名で検索"
            value={draftSearchText}
            onChange={(e) => setDraftSearchText(e.target.value)}
            className="ac-input !w-auto text-sm"
          />

          {categories.length > 0 && (
            <select
              value={draftCategoryFilter}
              onChange={(e) => setDraftCategoryFilter(e.target.value)}
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

          <button onClick={handleSearch} className="ac-btn-secondary text-sm">
            検索
          </button>
          <button onClick={handleClear} className="ac-btn-ghost text-sm">
            クリア
          </button>

          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="ac-input !w-auto text-sm"
          >
            <option value="name">店舗名順</option>
            <option value="category">カテゴリ順</option>
          </select>
        </div>

        {isLoading ? (
          <p className="text-sm font-bold text-wood-500">読み込み中...</p>
        ) : stores.length === 0 ? (
          <div className="ac-card relative text-center text-wood-500">
            <Leaf className="absolute -top-4 -left-4 h-9 w-9 -rotate-12 drop-shadow" />
            店舗がありません
          </div>
        ) : visibleStores.length === 0 ? (
          <div className="ac-card relative text-center text-wood-500">
            検索条件に一致する店舗がありません
          </div>
        ) : (
          <ul className="space-y-3">
            {visibleStores.map((store) => (
              <li
                key={store.id}
                data-testid="store-item"
                className="ac-card-sm flex items-center justify-between"
              >
                <button
                  type="button"
                  onClick={() => navigate(`/stores/${store.id}`)}
                  className="text-left"
                >
                  <p className="font-bold text-wood-800 hover:underline">{store.name}</p>
                  <p className="text-xs text-wood-400">
                    {store.category}
                    {store.open_time && store.close_time && ` ・ ${store.open_time} - ${store.close_time}`}
                  </p>
                </button>
                <div className="flex items-center gap-3">
                  {user && <LikeButton userId={user.id} storeId={store.id} initialCount={likeCounts[store.id] ?? 0} />}
                  <button
                    type="button"
                    onClick={() => setReservingStore(store)}
                    className="ac-btn-primary !px-4 !py-2 text-sm"
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
Expected: PASS（6件）

- [ ] **Step 5: コミット**

```bash
git add src/pages/StoresPage.tsx tests/unit/storesPage.test.tsx
git commit -m "feat: 店舗一覧の検索・絞り込みを検索ボタン方式にしクリアボタンを追加"
```

---

### Task 4: 最終確認

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
Expected: Task 1〜3で更新した3ファイルを含め全件PASS。既存テストに regression がないことを確認する

- [ ] **Step 4: 最終コミット（差分がある場合のみ）**

Lintやtypecheckの指摘で修正が発生した場合は、該当ファイルを追加してコミットする:

```bash
git add -A
git commit -m "fix: lint/typecheckの指摘を修正"
```
