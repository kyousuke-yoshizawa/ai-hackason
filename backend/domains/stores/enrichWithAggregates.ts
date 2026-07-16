import { supabaseAdmin } from '../../db.js'
import { unwrap } from '../../unwrap.js'
import { EMPTY_REVIEW_STATS, type ReviewStats } from '../../../shared/types/social.js'
import type { CongestionLevel } from '../crowd/types.js'

export interface StoreAggregates {
  like_count: number
  avg_rating: number
  review_count: number
  crowd_level: CongestionLevel | null
}

// crowd/getCurrentLevel.ts の resolveCurrentCrowdLevel と同じ鮮度判定（Issue #26）
const FRESHNESS_WINDOW_MS = 30 * 60 * 1000 // 30分

interface CrowdStatusRow {
  store_id: string
  level: CongestionLevel
  updated_at: string
}

interface CrowdPatternRow {
  store_id: string
  level: CongestionLevel
}

async function fetchLikeCounts(storeIds: string[]): Promise<Map<string, number>> {
  if (storeIds.length === 0) return new Map()

  const rows = (unwrap(
    await supabaseAdmin.from('likes').select('store_id').in('store_id', storeIds),
    'fetchLikeCounts',
  ) ?? []) as { store_id: string }[]

  const counts = new Map<string, number>()
  for (const row of rows) {
    counts.set(row.store_id, (counts.get(row.store_id) ?? 0) + 1)
  }
  return counts
}

async function fetchReviewStats(storeIds: string[]): Promise<Map<string, ReviewStats>> {
  if (storeIds.length === 0) return new Map()

  const rows = (unwrap(
    await supabaseAdmin.from('review_stats').select('*').in('store_id', storeIds),
    'fetchReviewStats',
  ) ?? []) as ReviewStats[]

  return new Map(rows.map((row) => [row.store_id, row]))
}

async function fetchCrowdLevels(
  storeIds: string[],
  now: Date,
): Promise<Map<string, CongestionLevel | null>> {
  if (storeIds.length === 0) return new Map()

  const [statusRows, patternRows] = await Promise.all([
    (unwrap(
      await supabaseAdmin.from('crowd_status').select('store_id, level, updated_at').in('store_id', storeIds),
      'fetchCrowdLevels(status)',
    ) ?? []) as CrowdStatusRow[],
    (unwrap(
      await supabaseAdmin
        .from('crowd_patterns')
        .select('store_id, level')
        .in('store_id', storeIds)
        .eq('hour_of_day', now.getHours()),
      'fetchCrowdLevels(pattern)',
    ) ?? []) as CrowdPatternRow[],
  ])

  const statusByStore = new Map(statusRows.map((row) => [row.store_id, row]))
  const patternByStore = new Map(patternRows.map((row) => [row.store_id, row.level]))

  const levels = new Map<string, CongestionLevel | null>()
  for (const storeId of storeIds) {
    const status = statusByStore.get(storeId)
    const isFresh = status && now.getTime() - new Date(status.updated_at).getTime() <= FRESHNESS_WINDOW_MS
    levels.set(storeId, isFresh ? status!.level : (patternByStore.get(storeId) ?? null))
  }
  return levels
}

/**
 * 店舗検索・絞込（Issue #84, #85）のために、いいね数・レビュー評価・現在の混雑度を
 * 一括取得して結合する（Issue #105: 店舗ごとの逐次3クエリだったN+1を、
 * .in()による集約クエリ3本に統合）。
 */
export async function enrichStoresWithAggregates<T extends { id: string }>(
  stores: T[],
): Promise<(T & StoreAggregates)[]> {
  const storeIds = stores.map((store) => store.id)

  const [likeCounts, reviewStats, crowdLevels] = await Promise.all([
    fetchLikeCounts(storeIds),
    fetchReviewStats(storeIds),
    fetchCrowdLevels(storeIds, new Date()),
  ])

  return stores.map((store) => {
    const stats = reviewStats.get(store.id) ?? EMPTY_REVIEW_STATS(store.id)
    return {
      ...store,
      like_count: likeCounts.get(store.id) ?? 0,
      avg_rating: stats.avg_rating,
      review_count: stats.review_count,
      crowd_level: crowdLevels.get(store.id) ?? null,
    }
  })
}
