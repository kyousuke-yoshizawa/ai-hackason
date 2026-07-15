jest.mock('../../backend/db', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createFakeSupabaseClient } = require('../testUtils/fakeSupabase')
  return { supabaseAdmin: createFakeSupabaseClient() }
})

import { supabaseAdmin } from '../../backend/db'
import type { FakeSupabaseClient } from '../testUtils/fakeSupabase'
import { resolveCurrentCrowdLevel, formatCrowdLevelForPrompt } from '../../backend/domains/crowd/getCurrentLevel'
import handler from '../../api/crowd/current/[store_id]'
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

// TC-110-02: GET /api/crowd/current で最新データ取得検証
// TC-110-INT-01 / シナリオ1: プラン生成時に混雑情報が反映されているか（resolveCurrentCrowdLevel を直接検証）
describe('resolveCurrentCrowdLevel (TC-110-02 / TC-110-INT-01)', () => {
  it('prefers a fresh (<=30min) crowd_status report over the preset pattern', async () => {
    const now = new Date('2026-07-13T12:00:00.000Z')
    fakeClient.seed('crowd_status', [
      { store_id: 'store-1', level: 'high', updated_at: new Date(now.getTime() - 5 * 60 * 1000).toISOString() },
    ])
    fakeClient.seed('crowd_patterns', [{ store_id: 'store-1', hour_of_day: now.getHours(), level: 'low' }])

    const result = await resolveCurrentCrowdLevel('store-1', now)

    expect(result).toMatchObject({ level: 'high', source: 'live' })
  })

  it('falls back to the preset pattern when the report is stale (>30min)', async () => {
    const now = new Date('2026-07-13T12:00:00.000Z')
    fakeClient.seed('crowd_status', [
      { store_id: 'store-1', level: 'high', updated_at: new Date(now.getTime() - 40 * 60 * 1000).toISOString() },
    ])
    fakeClient.seed('crowd_patterns', [{ store_id: 'store-1', hour_of_day: now.getHours(), level: 'medium' }])

    const result = await resolveCurrentCrowdLevel('store-1', now)

    expect(result).toEqual({ level: 'medium', source: 'pattern' })
  })

  it('returns unknown when there is neither a live report nor a preset pattern', async () => {
    const result = await resolveCurrentCrowdLevel('store-1', new Date('2026-07-13T12:00:00.000Z'))

    expect(result).toEqual({ level: null, source: 'unknown' })
  })

  it('formats a short Japanese prompt snippet reflecting the resolved level', () => {
    expect(formatCrowdLevelForPrompt('渋谷店', { level: 'high', source: 'live' })).toContain('渋谷店')
    expect(formatCrowdLevelForPrompt('渋谷店', { level: 'high', source: 'live' })).toContain('リアルタイム')
    expect(formatCrowdLevelForPrompt('渋谷店', { level: null, source: 'unknown' })).toContain('混雑情報なし')
  })
})

describe('GET /api/crowd/current/:store_id (TC-110-02)', () => {
  it('returns the resolved crowd level as JSON', async () => {
    fakeClient.seed('crowd_status', [
      { store_id: 'store-1', level: 'medium', updated_at: new Date().toISOString() },
    ])
    const res = createMockRes()

    await handler({ query: { store_id: 'store-1' } } as unknown as VercelRequest, res)

    expect(res.statusCode).toBe(200)
    expect(res.body).toMatchObject({ level: 'medium', source: 'live' })
  })

  it('rejects requests without store_id', async () => {
    const res = createMockRes()

    await handler({ query: {} } as unknown as VercelRequest, res)

    expect(res.statusCode).toBe(400)
  })
})
