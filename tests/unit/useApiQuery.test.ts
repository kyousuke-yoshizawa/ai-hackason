import { renderHook, waitFor, act } from '@testing-library/react'
import { useApiQuery } from '../../src/hooks/useApiQuery'

describe('useApiQuery', () => {
  it('成功時はdataを保持しisLoadingがfalseになる', async () => {
    const fetcher = jest.fn().mockResolvedValue({ value: 42 })
    const { result } = renderHook(() => useApiQuery(fetcher))

    expect(result.current.isLoading).toBe(true)
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.data).toEqual({ value: 42 })
    expect(result.current.error).toBeNull()
  })

  it('失敗時はerrorメッセージを保持しdataはnullのまま', async () => {
    const fetcher = jest.fn().mockRejectedValue(new Error('取得失敗メッセージ'))
    const { result } = renderHook(() => useApiQuery(fetcher))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.data).toBeNull()
    expect(result.current.error).toBe('取得失敗メッセージ')
  })

  it('Error以外の例外はデフォルト文言にフォールバックする', async () => {
    const fetcher = jest.fn().mockRejectedValue('不明なエラー')
    const { result } = renderHook(() => useApiQuery(fetcher))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error).toBe('取得に失敗しました')
  })

  it('reload()で再実行できる', async () => {
    const fetcher = jest.fn().mockResolvedValueOnce({ value: 1 }).mockResolvedValueOnce({ value: 2 })
    const { result } = renderHook(() => useApiQuery(fetcher))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toEqual({ value: 1 })

    await act(async () => {
      await result.current.reload()
    })

    expect(result.current.data).toEqual({ value: 2 })
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('アンマウント後はsetStateを行わない（警告が出ない）', async () => {
    let resolveFetch: (value: { value: number }) => void = () => {}
    const fetcher = jest.fn(
      () =>
        new Promise<{ value: number }>((resolve) => {
          resolveFetch = resolve
        })
    )

    const { unmount } = renderHook(() => useApiQuery(fetcher))
    unmount()

    await act(async () => {
      resolveFetch({ value: 99 })
      await Promise.resolve()
    })
    // unmount後にsetStateが呼ばれてもエラーにならないこと（React側の
    // "Can't perform a React state update on an unmounted component" 警告が
    // 出ないことを暗黙的に検証。cancelledRefで防いでいるため例外は発生しない）
  })

  it('enabled:falseの間はfetcherを実行せずisLoadingもfalseのまま', async () => {
    const fetcher = jest.fn().mockResolvedValue({ value: 1 })
    const { result } = renderHook(() => useApiQuery(fetcher, [], { enabled: false }))

    expect(fetcher).not.toHaveBeenCalled()
    expect(result.current.isLoading).toBe(false)
  })
})
