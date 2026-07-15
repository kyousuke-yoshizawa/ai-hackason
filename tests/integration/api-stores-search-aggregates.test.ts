/**
 * @jest-environment node
 */
// Issue #84: GET /api/stores の一覧に、いいね数・レビュー評価・現在の混雑度を
// 結合して返すことを検証する（Issue #85 の検索・絞込UIが利用するデータ）。

jest.mock('../../backend/db', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createFakeSupabaseClient } = require('../testUtils/fakeSupabase')
  return { supabaseAdmin: createFakeSupabaseClient() }
})

import request from 'supertest'
import { supabaseAdmin } from '../../backend/db'
import type { FakeSupabaseClient } from '../testUtils/fakeSupabase'
import { app } from '../../server/app'

const fakeClient = supabaseAdmin as unknown as FakeSupabaseClient

beforeEach(() => {
  fakeClient.reset()
  fakeClient.seed('stores', [
    { id: 'store-quiet', name: '静かな店', category: 'カフェ', deleted_at: null },
    { id: 'store-popular', name: '人気の店', category: 'レストラン', deleted_at: null },
  ])
  fakeClient.seed('users', [{ id: 'user-1', role: 'user', is_active: true }])
})

describe('GET /api/stores (Issue #84: 集計データ結合)', () => {
  it('returns zeroed aggregates for a store with no likes/reviews/crowd data', async () => {
    const res = await request(app).get('/api/stores')

    expect(res.status).toBe(200)
    const quiet = res.body.data.find((s: { id: string }) => s.id === 'store-quiet')
    expect(quiet).toMatchObject({ like_count: 0, avg_rating: 0, review_count: 0, crowd_level: null })
  })

  it('includes like_count aggregated from the likes table', async () => {
    fakeClient.seed('likes', [
      { id: 'like-1', user_id: 'user-1', store_id: 'store-popular' },
      { id: 'like-2', user_id: 'user-2', store_id: 'store-popular' },
    ])

    const res = await request(app).get('/api/stores')

    const popular = res.body.data.find((s: { id: string }) => s.id === 'store-popular')
    expect(popular.like_count).toBe(2)
  })

  it('includes avg_rating/review_count from review_stats', async () => {
    fakeClient.seed('review_stats', [
      { store_id: 'store-popular', avg_rating: 4.5, review_count: 10, last_updated: new Date().toISOString() },
    ])

    const res = await request(app).get('/api/stores')

    const popular = res.body.data.find((s: { id: string }) => s.id === 'store-popular')
    expect(popular.avg_rating).toBe(4.5)
    expect(popular.review_count).toBe(10)
  })

  it('prefers a fresh real-time crowd_status over the fallback pattern', async () => {
    fakeClient.seed('crowd_status', [
      { store_id: 'store-popular', level: 'high', updated_at: new Date().toISOString() },
    ])
    fakeClient.seed('crowd_patterns', [
      { store_id: 'store-popular', hour_of_day: new Date().getHours(), level: 'low' },
    ])

    const res = await request(app).get('/api/stores')

    const popular = res.body.data.find((s: { id: string }) => s.id === 'store-popular')
    expect(popular.crowd_level).toBe('high')
  })

  it('falls back to the hourly pattern when crowd_status is stale', async () => {
    const staleTime = new Date(Date.now() - 60 * 60 * 1000).toISOString() // 1時間前
    fakeClient.seed('crowd_status', [{ store_id: 'store-popular', level: 'high', updated_at: staleTime }])
    fakeClient.seed('crowd_patterns', [
      { store_id: 'store-popular', hour_of_day: new Date().getHours(), level: 'low' },
    ])

    const res = await request(app).get('/api/stores')

    const popular = res.body.data.find((s: { id: string }) => s.id === 'store-popular')
    expect(popular.crowd_level).toBe('low')
  })
})
