import { act, renderHook } from '@testing-library/react'
import { useStagedLoadingMessage } from '../../src/hooks/useStagedLoadingMessage'

describe('useStagedLoadingMessage', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('isActive=falseのときは初期メッセージのまま', () => {
    const { result } = renderHook(() => useStagedLoadingMessage(false))
    expect(result.current).toBe('ご要望を読み取っています…')
  })

  it('経過時間に応じてメッセージが切り替わる', () => {
    const { result } = renderHook(() => useStagedLoadingMessage(true))
    expect(result.current).toBe('ご要望を読み取っています…')

    act(() => {
      jest.advanceTimersByTime(2000)
    })
    expect(result.current).toBe('ことこと町のお店を調べています…')

    act(() => {
      jest.advanceTimersByTime(3000)
    })
    expect(result.current).toBe('素敵なプランを考えています…もう少しだけお待ちください')
  })

  it('アンマウント時にタイマーが残らない', () => {
    const clearSpy = jest.spyOn(global, 'clearTimeout')
    const { unmount } = renderHook(() => useStagedLoadingMessage(true))

    unmount()

    expect(clearSpy).toHaveBeenCalled()
    clearSpy.mockRestore()
  })
})
