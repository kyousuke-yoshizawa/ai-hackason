import { useEffect, useState } from 'react'
import { ApiError } from '../lib/api'
import type { SortDirection } from '../components/SortableHeader'

export interface UseMasterTableOptions<T, SK extends string, F extends Record<string, string>> {
  /** 一覧取得API呼び出し。戻り値は取得済みの配列そのもの */
  fetchItems: () => Promise<T[]>
  /** 取得失敗時、ApiErrorでなければ表示するフォールバックメッセージ */
  loadErrorMessage: string
  onNotify: (message: string, type?: 'success' | 'error') => void
  initialSortKey: SK
  /** カテゴリ・ロール・有効状態などの画面固有の追加フィルタ初期値（未使用ならデフォルトの空文字キー) */
  initialFilters: F
}

/**
 * 管理パネル（店舗/ユーザー）に共通する「検索(draft/applied)・追加フィルタ・
 * ソート・formMode・load/reload」の骨格を集約する。テキスト絞り込みや
 * ソート比較そのもの（どのフィールドを見るか）は画面ごとに異なるため、
 *呼び出し側のuseMemoに委ねる。
 */
export function useMasterTable<T, SK extends string, F extends Record<string, string>>({
  fetchItems,
  loadErrorMessage,
  onNotify,
  initialSortKey,
  initialFilters,
}: UseMasterTableOptions<T, SK, F>) {
  const [items, setItems] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [draftSearchText, setDraftSearchText] = useState('')
  const [appliedSearchText, setAppliedSearchText] = useState('')
  const [draftFilters, setDraftFilters] = useState<F>(initialFilters)
  const [appliedFilters, setAppliedFilters] = useState<F>(initialFilters)
  const [sortKey, setSortKey] = useState<SK>(initialSortKey)
  const [sortDir, setSortDir] = useState<SortDirection>('asc')
  const [formMode, setFormMode] = useState<'create' | T | null>(null)

  const reload = async () => {
    setIsLoading(true)
    try {
      setItems(await fetchItems())
    } catch (err) {
      onNotify(err instanceof ApiError ? err.message : loadErrorMessage, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSort = (key: SK) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const setDraftFilter = <K extends keyof F>(key: K, value: F[K]) => {
    setDraftFilters((prev) => ({ ...prev, [key]: value }))
  }

  const handleSearch = () => {
    setAppliedSearchText(draftSearchText)
    setAppliedFilters(draftFilters)
  }

  const handleClear = () => {
    setDraftSearchText('')
    setDraftFilters(initialFilters)
    setAppliedSearchText('')
    setAppliedFilters(initialFilters)
  }

  return {
    items,
    setItems,
    isLoading,
    reload,
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
  }
}
