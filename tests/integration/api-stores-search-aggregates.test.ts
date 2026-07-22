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

// Issue #132: 店舗一覧カード・プランカードに表示するための代表写真URL（thumbnail_url）を検証する
describe('GET /api/stores (Issue #132: thumbnail_url)', () => {
  it('returns thumbnail_url as null for a store with no store_media', async () => {
    const res = await request(app).get('/api/stores')

    const quiet = res.body.data.find((s: { id: string }) => s.id === 'store-quiet')
    expect(quiet.thumbnail_url).toBeNull()
  })

  it('uses the oldest (first-registered) store_media row as the thumbnail', async () => {
    fakeClient.seed('store_media', [
      {
        id: 'media-2',
        store_id: 'store-popular',
        file_path: 'store-popular/second.png',
        created_at: '2026-01-02T00:00:00.000Z',
      },
      {
        id: 'media-1',
        store_id: 'store-popular',
        file_path: 'store-popular/first.png',
        created_at: '2026-01-01T00:00:00.000Z',
      },
    ])

    const res = await request(app).get('/api/stores')

    const popular = res.body.data.find((s: { id: string }) => s.id === 'store-popular')
    expect(popular.thumbnail_url).toContain('store-popular/first.png')
    expect(popular.thumbnail_url).not.toContain('second.png')
  })

  it('resolves distinct thumbnails per store in a single batch (no N+1 leakage across stores)', async () => {
    fakeClient.seed('store_media', [
      {
        id: 'media-quiet',
        store_id: 'store-quiet',
        file_path: 'store-quiet/photo.png',
        created_at: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'media-popular',
        store_id: 'store-popular',
        file_path: 'store-popular/photo.png',
        created_at: '2026-01-01T00:00:00.000Z',
      },
    ])

    const res = await request(app).get('/api/stores')

    const quiet = res.body.data.find((s: { id: string }) => s.id === 'store-quiet')
    const popular = res.body.data.find((s: { id: string }) => s.id === 'store-popular')
    expect(quiet.thumbnail_url).toContain('store-quiet/photo.png')
    expect(popular.thumbnail_url).toContain('store-popular/photo.png')
  })
})

// Issue #134: リアルタイム混雑上書きの残効時間表示のため、crowd_status由来（source==='live'）の
// 場合のみcrowd_reported_atに報告時刻が入ることを検証する
describe('GET /api/stores (Issue #134: crowd_reported_at)', () => {
  it('returns crowd_reported_at as null when there is no crowd data at all', async () => {
    const res = await request(app).get('/api/stores')

    const quiet = res.body.data.find((s: { id: string }) => s.id === 'store-quiet')
    expect(quiet.crowd_reported_at).toBeNull()
  })

  it('sets crowd_reported_at to the crowd_status updated_at when a fresh real-time report exists', async () => {
    const reportedAt = new Date().toISOString()
    fakeClient.seed('crowd_status', [{ store_id: 'store-popular', level: 'high', updated_at: reportedAt }])

    const res = await request(app).get('/api/stores')

    const popular = res.body.data.find((s: { id: string }) => s.id === 'store-popular')
    expect(popular.crowd_reported_at).toBe(reportedAt)
  })

  it('returns crowd_reported_at as null when the level falls back to the hourly pattern (stale report)', async () => {
    const staleTime = new Date(Date.now() - 60 * 60 * 1000).toISOString() // 1時間前（新鮮ウィンドウ外）
    fakeClient.seed('crowd_status', [{ store_id: 'store-popular', level: 'high', updated_at: staleTime }])
    fakeClient.seed('crowd_patterns', [
      { store_id: 'store-popular', hour_of_day: new Date().getHours(), level: 'low' },
    ])

    const res = await request(app).get('/api/stores')

    const popular = res.body.data.find((s: { id: string }) => s.id === 'store-popular')
    expect(popular.crowd_level).toBe('low')
    expect(popular.crowd_reported_at).toBeNull()
  })
})

// Issue #136: 店舗ダッシュボードにプラン提案回数を表示するため、当日0時JST以降の
// plan_suggestions件数がtoday_suggestion_countに正しく反映されることを検証する
describe('GET /api/stores (Issue #136: today_suggestion_count)', () => {
  it('returns 0 for a store with no plan_suggestions rows', async () => {
    const res = await request(app).get('/api/stores')

    const quiet = res.body.data.find((s: { id: string }) => s.id === 'store-quiet')
    expect(quiet.today_suggestion_count).toBe(0)
  })

  it('counts only rows suggested since today (JST) midnight, per store', async () => {
    fakeClient.seed('plan_suggestions', [
      { id: 'sugg-1', store_id: 'store-popular', suggested_at: new Date().toISOString() },
      { id: 'sugg-2', store_id: 'store-popular', suggested_at: new Date().toISOString() },
      {
        id: 'sugg-3',
        store_id: 'store-popular',
        suggested_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2日前（対象外）
      },
      { id: 'sugg-4', store_id: 'store-quiet', suggested_at: new Date().toISOString() },
    ])

    const res = await request(app).get('/api/stores')

    const popular = res.body.data.find((s: { id: string }) => s.id === 'store-popular')
    const quiet = res.body.data.find((s: { id: string }) => s.id === 'store-quiet')
    expect(popular.today_suggestion_count).toBe(2)
    expect(quiet.today_suggestion_count).toBe(1)
  })
})
