import { act, renderHook, waitFor } from '@testing-library/react'
import { useMasterTable } from '../../src/hooks/useMasterTable'
import { ApiError } from '../../src/lib/api'

interface Item {
  id: string
  name: string
}

describe('useMasterTable', () => {
  it('マウント時にfetchItemsを呼びitemsへ反映する', async () => {
    const fetchItems = jest.fn().mockResolvedValue([{ id: '1', name: 'Alpha' }])
    const onNotify = jest.fn()

    const { result } = renderHook(() =>
      useMasterTable<Item, 'name', { category: string }>({
        fetchItems,
        loadErrorMessage: '取得に失敗しました',
        onNotify,
        initialSortKey: 'name',
        initialFilters: { category: 'all' },
      })
    )

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(fetchItems).toHaveBeenCalledTimes(1)
    expect(result.current.items).toEqual([{ id: '1', name: 'Alpha' }])
  })

  it('取得失敗時、ApiErrorのメッセージを優先してonNotifyする', async () => {
    const fetchItems = jest.fn().mockRejectedValue(new ApiError('サーバエラー', 500))
    const onNotify = jest.fn()

    const { result } = renderHook(() =>
      useMasterTable<Item, 'name', { category: string }>({
        fetchItems,
        loadErrorMessage: 'フォールバックメッセージ',
        onNotify,
        initialSortKey: 'name',
        initialFilters: { category: 'all' },
      })
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(onNotify).toHaveBeenCalledWith('サーバエラー', 'error')
  })

  it('取得失敗時、ApiError以外はフォールバックメッセージをonNotifyする', async () => {
    const fetchItems = jest.fn().mockRejectedValue(new Error('network down'))
    const onNotify = jest.fn()

    const { result } = renderHook(() =>
      useMasterTable<Item, 'name', { category: string }>({
        fetchItems,
        loadErrorMessage: 'フォールバックメッセージ',
        onNotify,
        initialSortKey: 'name',
        initialFilters: { category: 'all' },
      })
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(onNotify).toHaveBeenCalledWith('フォールバックメッセージ', 'error')
  })

  it('検索ボタン相当（handleSearch）を押すまでappliedSearchText/appliedFiltersは変化しない', async () => {
    const fetchItems = jest.fn().mockResolvedValue([])
    const { result } = renderHook(() =>
      useMasterTable<Item, 'name', { category: string }>({
        fetchItems,
        loadErrorMessage: '',
        onNotify: jest.fn(),
        initialSortKey: 'name',
        initialFilters: { category: 'all' },
      })
    )
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    act(() => {
      result.current.setDraftSearchText('al')
      result.current.setDraftFilter('category', 'Bakery')
    })

    expect(result.current.appliedSearchText).toBe('')
    expect(result.current.appliedFilters).toEqual({ category: 'all' })

    act(() => {
      result.current.handleSearch()
    })

    expect(result.current.appliedSearchText).toBe('al')
    expect(result.current.appliedFilters).toEqual({ category: 'Bakery' })
  })

  it('handleClearでdraft/appliedとも初期状態に戻る', async () => {
    const fetchItems = jest.fn().mockResolvedValue([])
    const { result } = renderHook(() =>
      useMasterTable<Item, 'name', { category: string }>({
        fetchItems,
        loadErrorMessage: '',
        onNotify: jest.fn(),
        initialSortKey: 'name',
        initialFilters: { category: 'all' },
      })
    )
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    act(() => {
      result.current.setDraftSearchText('al')
      result.current.setDraftFilter('category', 'Bakery')
    })
    act(() => {
      result.current.handleSearch()
    })
    expect(result.current.appliedSearchText).toBe('al')

    act(() => {
      result.current.handleClear()
    })

    expect(result.current.draftSearchText).toBe('')
    expect(result.current.appliedSearchText).toBe('')
    expect(result.current.draftFilters).toEqual({ category: 'all' })
    expect(result.current.appliedFilters).toEqual({ category: 'all' })
  })

  it('handleSortは同キー再クリックで昇順・降順をトグルし、別キーでは昇順から始まる', async () => {
    const fetchItems = jest.fn().mockResolvedValue([])
    const { result } = renderHook(() =>
      useMasterTable<Item, 'name' | 'category', { category: string }>({
        fetchItems,
        loadErrorMessage: '',
        onNotify: jest.fn(),
        initialSortKey: 'name',
        initialFilters: { category: 'all' },
      })
    )
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.sortKey).toBe('name')
    expect(result.current.sortDir).toBe('asc')

    act(() => result.current.handleSort('name'))
    expect(result.current.sortDir).toBe('desc')

    act(() => result.current.handleSort('name'))
    expect(result.current.sortDir).toBe('asc')

    act(() => result.current.handleSort('category'))
    expect(result.current.sortKey).toBe('category')
    expect(result.current.sortDir).toBe('asc')
  })

  it('formModeはcreate/アイテム/nullを保持しreloadでitemsを再取得する', async () => {
    const item: Item = { id: '1', name: 'Alpha' }
    const fetchItems = jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([item])
    const { result } = renderHook(() =>
      useMasterTable<Item, 'name', { category: string }>({
        fetchItems,
        loadErrorMessage: '',
        onNotify: jest.fn(),
        initialSortKey: 'name',
        initialFilters: { category: 'all' },
      })
    )
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.items).toEqual([])

    act(() => result.current.setFormMode('create'))
    expect(result.current.formMode).toBe('create')

    act(() => result.current.setFormMode(item))
    expect(result.current.formMode).toEqual(item)

    await act(async () => {
      await result.current.reload()
    })
    expect(result.current.items).toEqual([item])
  })
})
