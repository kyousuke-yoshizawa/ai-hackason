// Issue #104: backend/http/cronHandler.ts の単体テスト
import { createCronHandler } from '../../backend/http/cronHandler.js'

function createMockRes() {
  const res: { statusCode?: number; body?: unknown } = {}
  const json = jest.fn((body: unknown) => {
    res.body = body
  })
  const status = jest.fn((code: number) => {
    res.statusCode = code
    return { json }
  })
  return Object.assign(res, { status, json })
}

function createMockReq(authorization?: string) {
  return { headers: { authorization } } as unknown as { headers: Record<string, string | undefined> }
}

describe('createCronHandler', () => {
  const REAL_CRON_SECRET = process.env.CRON_SECRET

  beforeEach(() => {
    process.env.CRON_SECRET = 'test-secret'
  })

  afterEach(() => {
    process.env.CRON_SECRET = REAL_CRON_SECRET
  })

  it('CRON_SECRET が一致しない場合は 401 を返しジョブを実行しない', async () => {
    const job = jest.fn().mockResolvedValue({ ok: true })
    const handler = createCronHandler(job)
    const res = createMockRes()

    await handler(createMockReq('Bearer wrong-secret') as never, res as never)

    expect(res.statusCode).toBe(401)
    expect(job).not.toHaveBeenCalled()
  })

  it('CRON_SECRET が一致する場合はジョブを実行し結果を200で返す', async () => {
    const job = jest.fn().mockResolvedValue({ processedCount: 3 })
    const handler = createCronHandler(job)
    const res = createMockRes()

    await handler(createMockReq('Bearer test-secret') as never, res as never)

    expect(job).toHaveBeenCalledTimes(1)
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ processedCount: 3 })
  })

  it('ジョブが例外を投げた場合は 500 を返す', async () => {
    const job = jest.fn().mockRejectedValue(new Error('job failed'))
    const handler = createCronHandler(job)
    const res = createMockRes()

    await handler(createMockReq('Bearer test-secret') as never, res as never)

    expect(res.statusCode).toBe(500)
    expect(res.body).toMatchObject({ error: 'internal_error', message: 'job failed' })
  })
})
