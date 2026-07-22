jest.mock('../../backend/db', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createFakeSupabaseClient } = require('../testUtils/fakeSupabase')
  return { supabaseAdmin: createFakeSupabaseClient() }
})

import { supabaseAdmin } from '../../backend/db'
import type { FakeSupabaseClient } from '../testUtils/fakeSupabase'
import { getSuggestionCounts, recordPlanSuggestions } from '../../backend/domains/stores/planSuggestions'
import { collectStoreIdsFromCandidates } from '../../backend/domains/plan/collectStoreIds'
import type { PlanCandidate } from '../../backend/domains/plan/schema'

const fakeClient = supabaseAdmin as unknown as FakeSupabaseClient

beforeEach(() => {
  fakeClient.reset()
})

// Issue #136: 全candidatesのstopsから重複しないstore_idを抽出するロジック
describe('collectStoreIdsFromCandidates', () => {
  const buildStop = (storeId: string) => ({
    store_id: storeId,
    store_name: 'ダミー店舗',
    start_time: '10:00',
    end_time: '11:00',
    travel_note: '',
    reason: '',
  })

  it('dedupes store_ids that appear in multiple candidates/stops', () => {
    const candidates: PlanCandidate[] = [
      { label: 'A案', score: 0.9, summary: '', stops: [buildStop('store-1'), buildStop('store-2')] },
      { label: 'B案', score: 0.8, summary: '', stops: [buildStop('store-2'), buildStop('store-3')] },
    ]

    expect(collectStoreIdsFromCandidates(candidates)).toEqual(['store-1', 'store-2', 'store-3'])
  })

  it('returns an empty array when there are no candidates', () => {
    expect(collectStoreIdsFromCandidates([])).toEqual([])
  })
})

describe('recordPlanSuggestions', () => {
  it('inserts one row per unique store_id', async () => {
    await recordPlanSuggestions(['store-1', 'store-2', 'store-1'])

    const rows = fakeClient.getRows('plan_suggestions')
    expect(rows).toHaveLength(2)
    expect(rows.map((row) => row.store_id).sort()).toEqual(['store-1', 'store-2'])
  })

  it('does nothing (and does not throw) for an empty store_id array', async () => {
    await expect(recordPlanSuggestions([])).resolves.toBeUndefined()
    expect(fakeClient.getRows('plan_suggestions')).toHaveLength(0)
  })
})

// Issue #136: 指定した店舗ID群についてsinceJstMidnight以降の件数をstore_idごとに集計する
describe('getSuggestionCounts', () => {
  it('aggregates counts per store_id, ignoring rows before sinceJstMidnight or for other stores', async () => {
    const midnight = new Date('2026-07-22T15:00:00.000Z') // JST 2026-07-23 00:00
    fakeClient.seed('plan_suggestions', [
      { id: 's1', store_id: 'store-1', suggested_at: '2026-07-22T15:00:00.000Z' }, // ちょうど境界（含む）
      { id: 's2', store_id: 'store-1', suggested_at: '2026-07-23T01:00:00.000Z' },
      { id: 's3', store_id: 'store-1', suggested_at: '2026-07-22T14:59:00.000Z' }, // 境界より前（除外）
      { id: 's4', store_id: 'store-2', suggested_at: '2026-07-23T02:00:00.000Z' },
      { id: 's5', store_id: 'store-not-requested', suggested_at: '2026-07-23T02:00:00.000Z' },
    ])

    const counts = await getSuggestionCounts(['store-1', 'store-2'], midnight)

    expect(counts.get('store-1')).toBe(2)
    expect(counts.get('store-2')).toBe(1)
    expect(counts.has('store-not-requested')).toBe(false)
  })

  it('returns an empty map for an empty store_id array without querying', async () => {
    const counts = await getSuggestionCounts([], new Date())
    expect(counts.size).toBe(0)
  })

  it('returns 0 (via .get fallback) for a store with no suggestions in range', async () => {
    fakeClient.seed('plan_suggestions', [])
    const counts = await getSuggestionCounts(['store-1'], new Date('2026-07-22T15:00:00.000Z'))
    expect(counts.get('store-1') ?? 0).toBe(0)
  })
})
