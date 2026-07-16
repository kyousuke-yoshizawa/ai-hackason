// Issue #104: backend/http/method.ts の単体テスト
import { requireMethod } from '../../backend/http/method.js'

function createMockRes() {
  const status = jest.fn(() => ({ json: jest.fn() }))
  const setHeader = jest.fn()
  return { status, setHeader }
}

describe('requireMethod', () => {
  it('許可されたメソッドの場合は true を返しレスポンスを送出しない', () => {
    const res = createMockRes()
    expect(requireMethod({ method: 'POST' }, res, ['POST'])).toBe(true)
    expect(res.status).not.toHaveBeenCalled()
    expect(res.setHeader).not.toHaveBeenCalled()
  })

  it('許可されていないメソッドの場合は Allow ヘッダと 405 を送出し false を返す', () => {
    const res = createMockRes()
    expect(requireMethod({ method: 'GET' }, res, ['POST'])).toBe(false)
    expect(res.setHeader).toHaveBeenCalledWith('Allow', 'POST')
    expect(res.status).toHaveBeenCalledWith(405)
  })

  it('複数メソッド許可時は Allow ヘッダをカンマ区切りで送出する', () => {
    const res = createMockRes()
    expect(requireMethod({ method: 'DELETE' }, res, ['GET', 'POST'])).toBe(false)
    expect(res.setHeader).toHaveBeenCalledWith('Allow', 'GET, POST')
  })
})
