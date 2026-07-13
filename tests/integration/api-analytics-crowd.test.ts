jest.mock('../../backend/db', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createFakeSupabaseClient } = require('../testUtils/fakeSupabase')
  return { supabaseAdmin: createFakeSupabaseClient() }
})

import { supabaseAdmin } from '../../backend/db'
import type { FakeSupabaseClient } from '../testUtils/fakeSupabase'
import { runCrowdAnalyticsAggregationJob } from '../../backend/domains/crowdAnalytics/aggregationJob'
import handler from '../../api/analytics/crowd/[store_id]'
import type { VercelRequest, VercelResponse } from '@vercel/node'

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
  return res as VercelResponse & { statusCode: number; body: unknown }
}

beforeEach(() => {
  fakeClient.reset()
})

// TC-205-INT-01: crowd_snapshots(crowd_history) → crowd_analytics への集計検証
describe('runCrowdAnalyticsAggregationJob (TC-205-INT-01)', () => {
  it('aggregates the previous day crowd_history into crowd_analytics', async () => {
    const now = new Date('2026-07-13T00:30:00.000Z')
    fakeClient.seed('crowd_history', [
      { store_id: 'store-1', level: 'low', recorded_at: '2026-07-12T01:00:00.000Z' },
      { store_id: 'store-1', level: 'high', recorded_at: '2026-07-12T12:00:00.000Z' },
      { store_id: 'store-1', level: 'high', recorded_at: '2026-07-13T01:00:00.000Z' }, // 対象日外
    ])

    const result = await runCrowdAnalyticsAggregationJob(now)

    expect(result).toEqual({ datePeriod: '2026-07-12', storeCount: 1 })

    const analytics = fakeClient.getRows('crowd_analytics')
    expect(analytics).toHaveLength(1)
    expect(analytics[0]).toMatchObject({
      store_id: 'store-1',
      date_period: '2026-07-12',
      level_distribution: { low: 1, medium: 0, high: 1 },
      peak_hour: 12,
      peak_level: 'high',
      total_updates: 2,
    })
  })

  it('does nothing when there is no history for the previous day', async () => {
    const result = await runCrowdAnalyticsAggregationJob(new Date('2026-07-13T00:30:00.000Z'))

    expect(result).toEqual({ datePeriod: '2026-07-12', storeCount: 0 })
    expect(fakeClient.getRows('crowd_analytics')).toHaveLength(0)
  })
})

describe('GET /api/analytics/crowd/:store_id', () => {
  beforeEach(() => {
    fakeClient.seed('users', [
      { id: 'admin-1', role: 'admin', is_active: true },
      { id: 'manager-1', role: 'store_manager', is_active: true },
      { id: 'manager-2', role: 'store_manager', is_active: true },
    ])
    fakeClient.seed('store_managers', [{ store_id: 'store-1', manager_id: 'manager-1' }])
    fakeClient.seed('crowd_analytics', [
      {
        store_id: 'store-1',
        date_period: '2026-07-10',
        level_distribution: { low: 1, medium: 0, high: 0 },
        peak_hour: 10,
        peak_level: 'low',
        total_updates: 1,
      },
      {
        store_id: 'store-1',
        date_period: '2026-07-12',
        level_distribution: { low: 0, medium: 0, high: 2 },
        peak_hour: 12,
        peak_level: 'high',
        total_updates: 2,
      },
    ])
  })

  it('returns the store analytics for admin, sorted by date', async () => {
    const res = createMockRes()

    await handler(
      { query: { store_id: 'store-1' }, headers: { 'x-user-id': 'admin-1' } } as unknown as VercelRequest,
      res,
    )

    expect(res.statusCode).toBe(200)
    const body = res.body as { data: { datePeriod: string }[] }
    expect(body.data.map((r) => r.datePeriod)).toEqual(['2026-07-10', '2026-07-12'])
  })

  it('limits the result with the days query param', async () => {
    const res = createMockRes()

    await handler(
      {
        query: { store_id: 'store-1', days: '1' },
        headers: { 'x-user-id': 'admin-1' },
      } as unknown as VercelRequest,
      res,
    )

    const body = res.body as { data: { datePeriod: string }[] }
    expect(body.data).toEqual([expect.objectContaining({ datePeriod: '2026-07-12' })])
  })

  it('allows the assigned store manager', async () => {
    const res = createMockRes()

    await handler(
      { query: { store_id: 'store-1' }, headers: { 'x-user-id': 'manager-1' } } as unknown as VercelRequest,
      res,
    )

    expect(res.statusCode).toBe(200)
  })

  it('rejects a store manager not assigned to the store', async () => {
    const res = createMockRes()

    await handler(
      { query: { store_id: 'store-1' }, headers: { 'x-user-id': 'manager-2' } } as unknown as VercelRequest,
      res,
    )

    expect(res.statusCode).toBe(403)
  })

  it('rejects requests without store_id', async () => {
    const res = createMockRes()

    await handler({ query: {}, headers: { 'x-user-id': 'admin-1' } } as unknown as VercelRequest, res)

    expect(res.statusCode).toBe(400)
  })
})
