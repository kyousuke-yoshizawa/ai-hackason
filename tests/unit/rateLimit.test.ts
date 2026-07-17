// Issue #150: プラン生成APIの簡易レート制限（インメモリ固定ウィンドウ方式）
import { checkRateLimit } from '../../backend/http/rateLimit.js'

describe('checkRateLimit', () => {
  const REAL_NOW = Date.now

  afterEach(() => {
    Date.now = REAL_NOW
  })

  function mockNow(ms: number) {
    Date.now = () => ms
  }

  it('上限内のリクエストは許可される', () => {
    const key = `test-within-${Math.random()}`
    mockNow(1_000_000)
    for (let i = 0; i < 10; i++) {
      expect(checkRateLimit(key, 10, 60_000).allowed).toBe(true)
    }
  })

  it('上限を超えると429相当(allowed=false)になりretryAfterSecが返る', () => {
    const key = `test-exceed-${Math.random()}`
    mockNow(1_000_000)
    for (let i = 0; i < 10; i++) {
      checkRateLimit(key, 10, 60_000)
    }
    const result = checkRateLimit(key, 10, 60_000)
    expect(result.allowed).toBe(false)
    expect(result.retryAfterSec).toBeGreaterThan(0)
  })

  it('ウィンドウ経過後はリセットされる', () => {
    const key = `test-reset-${Math.random()}`
    mockNow(1_000_000)
    for (let i = 0; i < 10; i++) {
      checkRateLimit(key, 10, 60_000)
    }
    expect(checkRateLimit(key, 10, 60_000).allowed).toBe(false)

    mockNow(1_000_000 + 60_001)
    expect(checkRateLimit(key, 10, 60_000).allowed).toBe(true)
  })

  it('キーが異なれば互いに影響しない', () => {
    mockNow(2_000_000)
    const keyA = `test-key-a-${Math.random()}`
    const keyB = `test-key-b-${Math.random()}`
    for (let i = 0; i < 10; i++) {
      checkRateLimit(keyA, 10, 60_000)
    }
    expect(checkRateLimit(keyA, 10, 60_000).allowed).toBe(false)
    expect(checkRateLimit(keyB, 10, 60_000).allowed).toBe(true)
  })
})
