// Issue #104: backend/http/params.ts の単体テスト
import { requireStringParam } from '../../backend/http/params.js'

function createMockRes() {
  const status = jest.fn(() => ({ json: jest.fn() }))
  return { status }
}

describe('requireStringParam', () => {
  it('string 値が存在すればそのまま返す', () => {
    const res = createMockRes()
    expect(requireStringParam({ query: { store_id: 'store-1' } }, res, 'store_id')).toBe('store-1')
    expect(res.status).not.toHaveBeenCalled()
  })

  it('パラメータが欠落している場合は 400 を送出し null を返す', () => {
    const res = createMockRes()
    expect(requireStringParam({ query: {} }, res, 'store_id')).toBeNull()
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('パラメータが配列（多重指定）の場合も欠落と同様に扱う', () => {
    const res = createMockRes()
    expect(requireStringParam({ query: { store_id: ['a', 'b'] } }, res, 'store_id')).toBeNull()
    expect(res.status).toHaveBeenCalledWith(400)
  })
})
