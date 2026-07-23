import { supabaseAdmin } from '../../db.js'
import { unwrap } from '../../unwrap.js'
import { EMPTY_REVIEW_STATS, type ReviewStats } from '../../../shared/types/social.js'
import { resolveCurrentCrowdLevel } from '../crowd/getCurrentLevel.js'
import type { CongestionLevel } from '../crowd/types.js'
import { getStoreLikeCount } from '../social/likesRepository.js'
import { getStoreReviewStats } from '../social/reviewsRepository.js'
import { getThumbnailUrlsForStores } from './storeThumbnails.js'
import { getSuggestionCounts } from './planSuggestions.js'
import { getJstMidnightUtc } from '../../time.js'

export interface StoreAggregates {
  like_count: number
  avg_rating: number
  review_count: number
  crowd_level: CongestionLevel | null
  // Issue #134: リアルタイム混雑上書き（crowd_status）由来の場合のみ報告時刻が入る。
  // パターン由来・不明（unknown）の場合はnull
  crowd_reported_at: string | null
  thumbnail_url: string | null
  // Issue #136: 当日0時JST以降にこの店舗が候補に含まれてプラン生成された回数
  today_suggestion_count: number
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
): Promise<Map<string, { level: CongestionLevel | null; reportedAt: string | null }>> {
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

  const levels = new Map<string, { level: CongestionLevel | null; reportedAt: string | null }>()
  for (const storeId of storeIds) {
    const status = statusByStore.get(storeId)
    const isFresh = status && now.getTime() - new Date(status.updated_at).getTime() <= FRESHNESS_WINDOW_MS
    levels.set(
      storeId,
      isFresh
        ? { level: status!.level, reportedAt: status!.updated_at }
        : { level: patternByStore.get(storeId) ?? null, reportedAt: null },
    )
  }
  return levels
}

/**
 * いいね数・レビュー評価・現在の混雑度・代表写真URL・本日のプラン提案回数を
 * 1店舗分だけ結合する内部ヘルパー。サムネイルURL・提案回数は呼び出し元（単数/複数版）が
 * 取得したMapから渡してもらう（store_media・plan_suggestionsの一括取得を
 * enrichStoreWithAggregates単体からもenrichStoresWithAggregatesからも共有できるようにするため）。
 */
async function combineAggregates<T extends { id: string }>(
  store: T,
  thumbnailUrl: string | null,
  todaySuggestionCount: number,
): Promise<T & StoreAggregates> {
  const [likeCount, reviewStats, crowd] = await Promise.all([
    getStoreLikeCount(store.id),
    getStoreReviewStats(store.id),
    resolveCurrentCrowdLevel(store.id),
  ])

  return {
    ...store,
    like_count: likeCount,
    avg_rating: reviewStats.avg_rating,
    review_count: reviewStats.review_count,
    crowd_level: crowd.level,
    crowd_reported_at: crowd.source === 'live' ? crowd.updatedAt ?? null : null,
    thumbnail_url: thumbnailUrl,
    today_suggestion_count: todaySuggestionCount,
  }
}

/**
 * 店舗詳細（1店舗）向け。店舗検索・絞込のような一覧取得ではなく単体取得のため、
 * N+1を避ける集約バッチ化の対象外（そもそも1店舗分しか問い合わせない）。
 */
export async function enrichStoreWithAggregates<T extends { id: string }>(
  store: T,
): Promise<T & StoreAggregates> {
  const [thumbnailUrlsByStoreId, suggestionCounts] = await Promise.all([
    getThumbnailUrlsForStores([store.id]),
    getSuggestionCounts([store.id], getJstMidnightUtc(new Date())),
  ])
  return combineAggregates(
    store,
    thumbnailUrlsByStoreId.get(store.id) ?? null,
    suggestionCounts.get(store.id) ?? 0,
  )
}

/**
 * 店舗検索・絞込（Issue #84, #85）のために、いいね数・レビュー評価・現在の混雑度・
 * 代表写真URL（Issue #132）・本日のプラン提案回数（Issue #136）を、店舗ごとの逐次クエリではなく
 * .in()による集約クエリで一括取得して結合する（Issue #105: N+1解消）。
 */
export async function enrichStoresWithAggregates<T extends { id: string }>(
  stores: T[],
): Promise<(T & StoreAggregates)[]> {
  const storeIds = stores.map((store) => store.id)

  const [likeCounts, reviewStats, crowdLevels, thumbnailUrlsByStoreId, suggestionCounts] = await Promise.all([
    fetchLikeCounts(storeIds),
    fetchReviewStats(storeIds),
    fetchCrowdLevels(storeIds, new Date()),
    getThumbnailUrlsForStores(storeIds),
    getSuggestionCounts(storeIds, getJstMidnightUtc(new Date())),
  ])

  return stores.map((store) => {
    const stats = reviewStats.get(store.id) ?? EMPTY_REVIEW_STATS(store.id)
    const crowd = crowdLevels.get(store.id) ?? { level: null, reportedAt: null }
    return {
      ...store,
      like_count: likeCounts.get(store.id) ?? 0,
      avg_rating: stats.avg_rating,
      review_count: stats.review_count,
      crowd_level: crowd.level,
      crowd_reported_at: crowd.reportedAt,
      thumbnail_url: thumbnailUrlsByStoreId.get(store.id) ?? null,
      today_suggestion_count: suggestionCounts.get(store.id) ?? 0,
    }
  })
}
