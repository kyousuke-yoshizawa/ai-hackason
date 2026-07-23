import { ApiError } from '../../src/lib/api'
import { toApiResult } from '../../src/lib/toApiResult'

describe('toApiResult', () => {
  it('成功時はsuccess:trueとdataを返す', async () => {
    const result = await toApiResult(Promise.resolve({ foo: 'bar' }), 'デフォルトメッセージ')

    expect(result).toEqual({ success: true, data: { foo: 'bar' } })
  })

  it('ApiErrorの場合はそのメッセージを透過する', async () => {
    const result = await toApiResult(Promise.reject(new ApiError('サーバー側のメッセージ', 404)), 'デフォルトメッセージ')

    expect(result).toEqual({ success: false, message: 'サーバー側のメッセージ' })
  })

  it('ApiError以外の例外はフォールバック文言を返す', async () => {
    const result = await toApiResult(Promise.reject(new Error('ネットワークエラー')), 'デフォルトメッセージ')

    expect(result).toEqual({ success: false, message: 'デフォルトメッセージ' })
  })
})
