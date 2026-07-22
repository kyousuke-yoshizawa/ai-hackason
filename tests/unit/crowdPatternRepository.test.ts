jest.mock('../../backend/db', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createFakeSupabaseClient } = require('../testUtils/fakeSupabase')
  return { supabaseAdmin: createFakeSupabaseClient() }
})

import { supabaseAdmin } from '../../backend/db'
import type { FakeSupabaseClient } from '../testUtils/fakeSupabase'
import { getCrowdPattern, listCrowdPatterns, replaceCrowdPatterns } from '../../backend/domains/crowd/repository'

const fakeClient = supabaseAdmin as unknown as FakeSupabaseClient

beforeEach(() => {
  fakeClient.reset()
})

// Issue #99: 混雑パターン設定グリッドUI＋曜日次元の追加
// getCrowdPattern は「曜日一致 → 見つからなければ day_of_week IS NULL（全曜日共通）」の
// 優先順位でフォールバックする。
describe('getCrowdPattern (day-of-week priority with NULL fallback)', () => {
  it('prefers the day-specific pattern over the all-days (NULL) fallback', async () => {
    fakeClient.seed('crowd_patterns', [
      { store_id: 'store-1', day_of_week: null, hour_of_day: 12, level: 'low' },
      { store_id: 'store-1', day_of_week: 3, hour_of_day: 12, level: 'high' },
    ])

    const level = await getCrowdPattern('store-1', 12, 3)

    expect(level).toBe('high')
  })

  it('falls back to the NULL (all-days) pattern when no day-specific row exists', async () => {
    fakeClient.seed('crowd_patterns', [{ store_id: 'store-1', day_of_week: null, hour_of_day: 12, level: 'medium' }])

    const level = await getCrowdPattern('store-1', 12, 3)

    expect(level).toBe('medium')
  })

  it('returns null when neither a day-specific nor a NULL fallback row exists', async () => {
    fakeClient.seed('crowd_patterns', [{ store_id: 'store-1', day_of_week: 1, hour_of_day: 12, level: 'high' }])

    const level = await getCrowdPattern('store-1', 12, 3)

    expect(level).toBeNull()
  })

  it('returns null when the store has no patterns at all', async () => {
    const level = await getCrowdPattern('store-1', 12, 3)

    expect(level).toBeNull()
  })

  it('does not match a day-specific row for a different hour', async () => {
    fakeClient.seed('crowd_patterns', [{ store_id: 'store-1', day_of_week: 3, hour_of_day: 9, level: 'high' }])

    const level = await getCrowdPattern('store-1', 12, 3)

    expect(level).toBeNull()
  })
})

describe('replaceCrowdPatterns / listCrowdPatterns', () => {
  it('replaces the full pattern set for a store', async () => {
    fakeClient.seed('crowd_patterns', [{ store_id: 'store-1', day_of_week: null, hour_of_day: 9, level: 'low' }])

    await replaceCrowdPatterns('store-1', [
      { dayOfWeek: 1, hourOfDay: 10, level: 'high' },
      { dayOfWeek: null, hourOfDay: 9, level: 'medium' },
    ])

    const patterns = await listCrowdPatterns('store-1')
    expect(patterns).toHaveLength(2)
    expect(patterns).toEqual(
      expect.arrayContaining([
        { dayOfWeek: 1, hourOfDay: 10, level: 'high' },
        { dayOfWeek: null, hourOfDay: 9, level: 'medium' },
      ]),
    )
  })

  it('does not affect another store\'s patterns', async () => {
    fakeClient.seed('crowd_patterns', [{ store_id: 'store-2', day_of_week: null, hour_of_day: 9, level: 'low' }])

    await replaceCrowdPatterns('store-1', [{ dayOfWeek: 1, hourOfDay: 10, level: 'high' }])

    const store2Patterns = await listCrowdPatterns('store-2')
    expect(store2Patterns).toEqual([{ dayOfWeek: null, hourOfDay: 9, level: 'low' }])
  })

  it('returns an empty array when the store has no patterns', async () => {
    const patterns = await listCrowdPatterns('store-1')

    expect(patterns).toEqual([])
  })

  // 重複キーは通常 putCrowdPatternsBodySchema の zod refine で route 層で弾かれるが、
  // ここでは repository 単体として「一括insertが all-or-nothing であること」（defense in depth）を検証する。
  it('does not leave a partially-written state when the insert batch violates a unique constraint', async () => {
    fakeClient.setUniqueConstraint('crowd_patterns', ['store_id', 'day_of_week', 'hour_of_day'])
    fakeClient.seed('crowd_patterns', [{ store_id: 'store-1', day_of_week: null, hour_of_day: 9, level: 'low' }])

    await expect(
      replaceCrowdPatterns('store-1', [
        { dayOfWeek: 1, hourOfDay: 10, level: 'high' },
        { dayOfWeek: 1, hourOfDay: 10, level: 'medium' },
      ]),
    ).rejects.toThrow()

    // delete は実行済みだが、insert がバッチ全体として失敗しているため1件も挿入されていない
    // （中途半端に一部だけ書き込まれた状態にはならない）
    const patterns = await listCrowdPatterns('store-1')
    expect(patterns).toEqual([])
  })
})
