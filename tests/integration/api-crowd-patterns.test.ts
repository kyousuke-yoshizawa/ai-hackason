jest.mock('../../backend/db', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createFakeSupabaseClient } = require('../testUtils/fakeSupabase')
  return { supabaseAdmin: createFakeSupabaseClient() }
})

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabaseAdmin } from '../../backend/db'
import type { FakeSupabaseClient } from '../testUtils/fakeSupabase'
import handler from '../../api/crowd/index'

const fakeClient = supabaseAdmin as unknown as FakeSupabaseClient

function createMockRes() {
  const res: Partial<VercelResponse> & { statusCode?: number; body?: unknown } = {}
  res.status = jest.fn((code: number) => {
    res.statusCode = code
    return res as VercelResponse
  }) as unknown as VercelResponse['status']
  res.json = jest.fn((body: unknown) => {
    res.body = body
    return res as VercelResponse
  }) as unknown as VercelResponse['json']
  res.setHeader = jest.fn(() => res as VercelResponse) as unknown as VercelResponse['setHeader']
  return res as VercelResponse & { statusCode: number; body: unknown }
}

function createMockReq(
  method: 'GET' | 'PUT',
  storeId: string,
  options: { body?: unknown; userId?: string } = {},
): VercelRequest {
  return {
    method,
    query: {},
    url: `/api/crowd/patterns/${storeId}`,
    body: options.body,
    headers: options.userId ? { 'x-user-id': options.userId } : {},
  } as unknown as VercelRequest
}

beforeEach(() => {
  fakeClient.reset()
  fakeClient.seed('users', [
    { id: 'manager-1', role: 'user', is_active: true },
    { id: 'other-user', role: 'user', is_active: true },
    { id: 'admin-1', role: 'admin', is_active: true },
  ])
  fakeClient.seed('store_managers', [{ store_id: 'store-1', manager_id: 'manager-1' }])
})

// Issue #99: 混雑パターン設定グリッドUI＋曜日次元の追加
describe('GET /api/crowd/patterns/:store_id', () => {
  it('returns the stored patterns for the store manager', async () => {
    fakeClient.seed('crowd_patterns', [
      { store_id: 'store-1', day_of_week: null, hour_of_day: 9, level: 'low' },
      { store_id: 'store-1', day_of_week: 3, hour_of_day: 12, level: 'high' },
      { store_id: 'store-2', day_of_week: null, hour_of_day: 9, level: 'medium' },
    ])
    const res = createMockRes()

    await handler(createMockReq('GET', 'store-1', { userId: 'manager-1' }), res)

    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual(
      expect.arrayContaining([
        { day_of_week: null, hour_of_day: 9, level: 'low' },
        { day_of_week: 3, hour_of_day: 12, level: 'high' },
      ]),
    )
    expect(res.body as unknown[]).toHaveLength(2)
  })

  it('rejects a caller who is neither admin nor the assigned store manager', async () => {
    const res = createMockRes()

    await handler(createMockReq('GET', 'store-1', { userId: 'other-user' }), res)

    expect(res.statusCode).toBe(403)
  })
})

describe('PUT /api/crowd/patterns/:store_id', () => {
  const validBody = [
    { day_of_week: 1, hour_of_day: 10, level: 'high' },
    { day_of_week: null, hour_of_day: 9, level: 'low' },
  ]

  it('replaces the pattern set when the caller is the assigned store manager', async () => {
    const res = createMockRes()

    await handler(createMockReq('PUT', 'store-1', { body: validBody, userId: 'manager-1' }), res)

    expect(res.statusCode).toBe(200)
    expect(fakeClient.getRows('crowd_patterns')).toEqual([
      expect.objectContaining({ store_id: 'store-1', day_of_week: 1, hour_of_day: 10, level: 'high' }),
      expect.objectContaining({ store_id: 'store-1', day_of_week: null, hour_of_day: 9, level: 'low' }),
    ])
  })

  it('allows an admin regardless of store_managers membership', async () => {
    const res = createMockRes()

    await handler(createMockReq('PUT', 'store-1', { body: validBody, userId: 'admin-1' }), res)

    expect(res.statusCode).toBe(200)
  })

  it('rejects a caller who is neither admin nor the assigned store manager', async () => {
    const res = createMockRes()

    await handler(createMockReq('PUT', 'store-1', { body: validBody, userId: 'other-user' }), res)

    expect(res.statusCode).toBe(403)
    expect(fakeClient.getRows('crowd_patterns')).toHaveLength(0)
  })

  it('rejects an invalid level value', async () => {
    const res = createMockRes()

    await handler(
      createMockReq('PUT', 'store-1', {
        body: [{ day_of_week: 1, hour_of_day: 10, level: 'super-crowded' }],
        userId: 'manager-1',
      }),
      res,
    )

    expect(res.statusCode).toBe(400)
    expect(fakeClient.getRows('crowd_patterns')).toHaveLength(0)
  })

  it('rejects an out-of-range hour_of_day', async () => {
    const res = createMockRes()

    await handler(
      createMockReq('PUT', 'store-1', {
        body: [{ day_of_week: 1, hour_of_day: 24, level: 'high' }],
        userId: 'manager-1',
      }),
      res,
    )

    expect(res.statusCode).toBe(400)
  })

  it('rejects an out-of-range day_of_week', async () => {
    const res = createMockRes()

    await handler(
      createMockReq('PUT', 'store-1', {
        body: [{ day_of_week: 7, hour_of_day: 10, level: 'high' }],
        userId: 'manager-1',
      }),
      res,
    )

    expect(res.statusCode).toBe(400)
  })

  it('rejects duplicate (day_of_week, hour_of_day) pairs and leaves existing patterns untouched', async () => {
    fakeClient.seed('crowd_patterns', [{ store_id: 'store-1', day_of_week: null, hour_of_day: 9, level: 'low' }])
    const res = createMockRes()

    await handler(
      createMockReq('PUT', 'store-1', {
        body: [
          { day_of_week: 1, hour_of_day: 10, level: 'high' },
          { day_of_week: 1, hour_of_day: 10, level: 'medium' },
        ],
        userId: 'manager-1',
      }),
      res,
    )

    expect(res.statusCode).toBe(400)
    // 検証は削除より前に走るため、既存のパターン行は削除されず残っている
    // （重複キーがDBのUNIQUE制約違反として検出される頃には既に削除済み、という
    //   部分的な書き換わりを防ぐのがこのバリデーションの目的）。
    expect(fakeClient.getRows('crowd_patterns')).toEqual([
      expect.objectContaining({ store_id: 'store-1', day_of_week: null, hour_of_day: 9, level: 'low' }),
    ])
  })

  it('treats a duplicate NULL day_of_week for the same hour_of_day as a conflict too', async () => {
    const res = createMockRes()

    await handler(
      createMockReq('PUT', 'store-1', {
        body: [
          { day_of_week: null, hour_of_day: 9, level: 'low' },
          { day_of_week: null, hour_of_day: 9, level: 'high' },
        ],
        userId: 'manager-1',
      }),
      res,
    )

    expect(res.statusCode).toBe(400)
  })

  it('accepts a full grid of 192 entries (8 day-of-week variants x 24 hours)', async () => {
    // day_of_week に null（全曜日共通）を含めた8種類 x 24時間 = 192通りが
    // ちょうど上限。CrowdPatternGridのUIがこの8行x24列を全て埋めて保存する
    // ケースを想定しており、これが拒否されないことを確認する。
    const dayOptions: (number | null)[] = [null, 0, 1, 2, 3, 4, 5, 6]
    const fullGrid: { day_of_week: number | null; hour_of_day: number; level: 'low' }[] = []
    for (const day of dayOptions) {
      for (let hour = 0; hour < 24; hour++) {
        fullGrid.push({ day_of_week: day, hour_of_day: hour, level: 'low' })
      }
    }
    expect(fullGrid).toHaveLength(192)
    const res = createMockRes()

    await handler(createMockReq('PUT', 'store-1', { body: fullGrid, userId: 'manager-1' }), res)

    expect(res.statusCode).toBe(200)
  })

  it('rejects a patterns array larger than 192 entries (8 day-of-week variants x 24 hours)', async () => {
    // (day_of_week, hour_of_day) の組み合わせは8種類x24時間=192通りしか存在しないため、
    // 192件を超える配列は必ず重複エントリを含む。上限チェックと重複チェックのどちらで
    // 弾かれても構わないが、いずれにせよ400で拒否され、変更が反映されないことを確認する。
    const dayOptions: (number | null)[] = [null, 0, 1, 2, 3, 4, 5, 6]
    const fullGrid: { day_of_week: number | null; hour_of_day: number; level: 'low' }[] = []
    for (const day of dayOptions) {
      for (let hour = 0; hour < 24; hour++) {
        fullGrid.push({ day_of_week: day, hour_of_day: hour, level: 'low' })
      }
    }
    const tooMany = [...fullGrid, fullGrid[0]]
    const res = createMockRes()

    await handler(createMockReq('PUT', 'store-1', { body: tooMany, userId: 'manager-1' }), res)

    expect(res.statusCode).toBe(400)
    expect(fakeClient.getRows('crowd_patterns')).toHaveLength(0)
  })
})
