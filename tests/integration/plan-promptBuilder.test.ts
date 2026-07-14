jest.mock('../../backend/db', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createFakeSupabaseClient } = require('../testUtils/fakeSupabase')
  return { supabaseAdmin: createFakeSupabaseClient() }
})

import { supabaseAdmin } from '../../backend/db'
import type { FakeSupabaseClient } from '../testUtils/fakeSupabase'
import { buildStoreContexts, type StoreForPrompt } from '../../backend/domains/plan/promptBuilder'

const fakeClient = supabaseAdmin as unknown as FakeSupabaseClient

const STORE: StoreForPrompt = {
  id: 'store-1',
  name: 'のんびり亭',
  category: '定食屋・ランチ',
  x: -100,
  y: 30,
  open_time: '11:00',
  close_time: '21:00',
  price_min: 900,
  price_max: 1300,
}

beforeEach(() => {
  fakeClient.reset()
})

describe('buildStoreContexts', () => {
  it('リアルタイム混雑報告・レビュー統計があれば取り込んでスコアを算出する', async () => {
    fakeClient.seed('crowd_status', [
      { store_id: 'store-1', level: 'low', updated_at: new Date().toISOString() },
    ])
    fakeClient.seed('review_stats', [
      { store_id: 'store-1', avg_rating: 4.5, review_count: 3, last_updated: new Date().toISOString() },
    ])

    const [context] = await buildStoreContexts([STORE])

    expect(context.distanceTag).toBe('near') // (-100, 30) からどんぐり広場(0,0)までは約104m
    expect(context.rating).toBe(4.5)
    expect(context.crowdText).toContain('空いている')
    expect(context.score).toBeGreaterThan(0)
    expect(context.score).toBeLessThanOrEqual(1)
  })

  it('混雑情報・レビューが無い店舗は中間値でスコアを算出する（不明では落ちない）', async () => {
    const [context] = await buildStoreContexts([STORE])

    expect(context.rating).toBeNull()
    expect(context.crowdText).toContain('混雑情報なし')
    expect(context.score).toBeGreaterThan(0)
  })
})
