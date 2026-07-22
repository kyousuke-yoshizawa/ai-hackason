import { useEffect, useMemo, useState } from 'react'
import { api, ApiError } from '../lib/api'
import { reportCrowdLevel } from '../lib/crowd'
import { remainingMinutes } from '../lib/crowdLive'
import { AdminStore, StoreForm } from './StoreForm'
import { CrowdAnalyticsDashboard } from './CrowdAnalyticsDashboard'
import { CrowdPatternGrid } from './CrowdPatternGrid'
import { Modal } from './Modal'
import { StoreMediaPanel } from './StoreMediaPanel'
import { StoreOfferPanel } from './StoreOfferPanel'
import { SortableColumnLabel, SortDirection } from './SortableHeader'
import type { CongestionLevel } from '../../shared/types/crowd'
import { CROWD_LEVEL_LABEL } from '../../shared/types/crowd'

type StoreSortKey = 'name' | 'category' | 'open_time'

const CROWD_BADGE_CLASS: Record<CongestionLevel, string> = {
  low: 'bg-leaf-100 text-leaf-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-bubble-100 text-bubble-700',
}

function CrowdStatusBadge({ level }: { level?: CongestionLevel | null }) {
  if (!level) {
    return <span className="ac-badge bg-gray-100 text-gray-500">未報告</span>
  }
  return <span className={`ac-badge ${CROWD_BADGE_CLASS[level]}`}>{CROWD_LEVEL_LABEL[level]}</span>
}

// ライブ混雑報告の残効時間・パターン由来の注記を表示する（Issue #134）
function CrowdLiveIndicator({ store, now }: { store: AdminStore; now: Date }) {
  const remaining = remainingMinutes(store.crowd_reported_at ?? null, now)

  if (remaining !== null && remaining > 0) {
    return <span className="text-[11px] font-bold text-sky-600">ライブ報告 あと{remaining}分有効</span>
  }
  if (!store.crowd_reported_at && store.crowd_level) {
    return <span className="text-[11px] text-wood-400">事前パターンより</span>
  }
  return null
}

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
  const [patternStore, setPatternStore] = useState<AdminStore | null>(null)
  const [offerStore, setOfferStore] = useState<AdminStore | null>(null)
  const [now, setNow] = useState(() => new Date())

  // ライブ混雑報告の残効時間表示を更新するための1分間隔の再描画（Issue #134）
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

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

  const handleReportCrowd = async (store: AdminStore, level: 'low' | 'high') => {
    const result = await reportCrowdLevel(store.id, level)
    if (result.success) {
      onNotify(`${store.name} の混雑状況を「${CROWD_LEVEL_LABEL[level]}」に更新しました`)
      await loadStores()
    } else {
      onNotify(result.message ?? '混雑状況の報告に失敗しました', 'error')
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
          <div className="hidden gap-4 px-4 text-xs font-bold text-wood-500 md:grid md:grid-cols-[2fr_1.2fr_1.5fr_1.6fr_1fr_2.3fr]">
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
            <span>本日の混雑</span>
            <span>本日の提案回数</span>
            <span>アクション</span>
          </div>
          {visibleStores.map((s) => (
            <div
              key={s.id}
              data-testid="store-row"
              className="grid grid-cols-1 gap-2 rounded-2xl border-2 border-wood-200 bg-sand-50 p-4 md:grid-cols-[2fr_1.2fr_1.5fr_1.6fr_1fr_2.3fr] md:items-center"
            >
              <p className="font-bold text-wood-800">{s.name}</p>
              <p>
                <span className="ac-badge bg-leaf-100 text-leaf-700">{s.category}</span>
              </p>
              <p className="text-sm text-wood-600">
                {s.open_time && s.close_time ? `${s.open_time} - ${s.close_time}` : '-'}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-col gap-0.5">
                  <CrowdStatusBadge level={s.crowd_level} />
                  <CrowdLiveIndicator store={s} now={now} />
                </div>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <button
                    onClick={() => handleReportCrowd(s, 'low')}
                    className="rounded-full border-2 border-leaf-300 bg-white px-2.5 py-1 font-bold text-leaf-700 transition hover:bg-leaf-50 focus:outline-none focus:ring-2 focus:ring-leaf-300"
                  >
                    空いてる
                  </button>
                  <button
                    onClick={() => handleReportCrowd(s, 'high')}
                    className="rounded-full border-2 border-bubble-300 bg-white px-2.5 py-1 font-bold text-bubble-700 transition hover:bg-bubble-50 focus:outline-none focus:ring-2 focus:ring-bubble-300"
                  >
                    混んでる
                  </button>
                </div>
              </div>
              <p className="text-sm text-wood-600">
                {s.today_suggestion_count ? `${s.today_suggestion_count}回` : '-'}
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
                  onClick={() => setPatternStore(s)}
                  className="font-bold text-amber-600 hover:underline"
                >
                  混雑パターン
                </button>
                <button
                  onClick={() => setOfferStore(s)}
                  className="font-bold text-purple-600 hover:underline"
                >
                  オファー
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
          existingStores={stores.map((s) => ({ name: s.name, x: s.x, y: s.y }))}
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

      {patternStore && (
        <Modal
          title={`混雑パターン設定 - ${patternStore.name}`}
          onClose={() => setPatternStore(null)}
          maxWidth="max-w-4xl"
        >
          <CrowdPatternGrid
            storeId={patternStore.id}
            onSaved={() => {
              onNotify(`${patternStore.name} の混雑パターンを保存しました`)
              setPatternStore(null)
            }}
            onError={(message) => onNotify(message, 'error')}
          />
        </Modal>
      )}

      {offerStore && (
        <Modal title={`オファー管理 - ${offerStore.name}`} onClose={() => setOfferStore(null)} maxWidth="max-w-2xl">
          <StoreOfferPanel
            storeId={offerStore.id}
            storeName={offerStore.name}
            storeCategory={offerStore.category}
            onNotify={onNotify}
          />
        </Modal>
      )}
    </div>
  )
}
