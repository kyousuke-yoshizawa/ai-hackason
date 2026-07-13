process.env.LINK_TOKEN_SECRET = 'test-secret'

jest.mock('../../api/_lib/supabaseAdmin', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createFakeSupabaseClient } = require('../testUtils/fakeSupabase')
  return { supabaseAdmin: createFakeSupabaseClient() }
})

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabaseAdmin } from '../../api/_lib/supabaseAdmin'
import type { FakeSupabaseClient } from '../testUtils/fakeSupabase'
import { generateLinkToken } from '../../api/_lib/email/linkToken'
import handler from '../../api/crowd/report'

const fakeClient = supabaseAdmin as unknown as FakeSupabaseClient

function createMockRes() {
  const res: Partial<VercelResponse> & { statusCode?: number; body?: string } = {}
  res.status = jest.fn((code: number) => {
    res.statusCode = code
    return res as VercelResponse
  }) as unknown as VercelResponse['status']
  res.setHeader = jest.fn(() => res as VercelResponse) as unknown as VercelResponse['setHeader']
  res.send = jest.fn((body: string) => {
    res.body = body
    return res as VercelResponse
  }) as unknown as VercelResponse['send']
  return res as VercelResponse & { statusCode: number; body: string }
}

function createMockReq(query: Record<string, string>): VercelRequest {
  return { query } as unknown as VercelRequest
}

const basePayload = {
  notificationId: 'notif-1',
  storeId: 'store-1',
  managerId: 'manager-1',
}

beforeEach(() => {
  fakeClient.reset()
  fakeClient.seed('email_notifications', [
    { id: 'notif-1', store_id: 'store-1', manager_id: 'manager-1', link_used_at: null },
  ])
})

// TC-109-03: ボタンリンク → crowd_status/crowd_history 記録の一連フロー
describe('GET /api/crowd/report (TC-109-03)', () => {
  it('records the reported level and marks the link as used', async () => {
    const token = generateLinkToken({ ...basePayload, expiresAt: Date.now() + 60_000 })
    const res = createMockRes()

    await handler(createMockReq({ store_id: 'store-1', level: 'high', token }), res)

    expect(res.statusCode).toBe(200)
    expect(fakeClient.getRows('crowd_status')).toEqual([
      expect.objectContaining({ store_id: 'store-1', level: 'high', updated_by: 'manager-1' }),
    ])
    expect(fakeClient.getRows('crowd_history')).toHaveLength(1)
    expect(fakeClient.getRows('email_notifications')[0].link_used_at).toBeTruthy()
  })

  it('rejects a reused (already-used) token', async () => {
    fakeClient.seed('email_notifications', [
      { id: 'notif-1', store_id: 'store-1', manager_id: 'manager-1', link_used_at: new Date().toISOString() },
    ])
    const token = generateLinkToken({ ...basePayload, expiresAt: Date.now() + 60_000 })
    const res = createMockRes()

    await handler(createMockReq({ store_id: 'store-1', level: 'high', token }), res)

    expect(res.statusCode).toBe(410)
    expect(fakeClient.getRows('crowd_history')).toHaveLength(0)
  })

  it('rejects an expired token', async () => {
    const token = generateLinkToken({ ...basePayload, expiresAt: Date.now() - 1000 })
    const res = createMockRes()

    await handler(createMockReq({ store_id: 'store-1', level: 'high', token }), res)

    expect(res.statusCode).toBe(401)
    expect(fakeClient.getRows('crowd_history')).toHaveLength(0)
  })

  it('rejects a token whose store_id does not match the query param', async () => {
    const token = generateLinkToken({ ...basePayload, expiresAt: Date.now() + 60_000 })
    const res = createMockRes()

    await handler(createMockReq({ store_id: 'store-999', level: 'high', token }), res)

    expect(res.statusCode).toBe(403)
    expect(fakeClient.getRows('crowd_history')).toHaveLength(0)
  })
})
