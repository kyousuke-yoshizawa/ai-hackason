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
 * 店舗検索・絞込（Issue #84, #85）のために、いいね数・レビュー評価・現在の混雑度・
 * 代表写真URL（Issue #132）・本日のプラン提案回数（Issue #136）を店舗ごとに並行取得して
 * 結合する。店舗一覧APIでのみ使用する想定（店舗数がハッカソン規模である前提でN+1を許容している）。
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

export async function enrichStoresWithAggregates<T extends { id: string }>(
  stores: T[],
): Promise<(T & StoreAggregates)[]> {
  const storeIds = stores.map((store) => store.id)
  // store_media・plan_suggestionsはstore_id配列で一括取得し、N+1を避ける（likesRepository.getUserLikes参照）
  const [thumbnailUrlsByStoreId, suggestionCounts] = await Promise.all([
    getThumbnailUrlsForStores(storeIds),
    getSuggestionCounts(storeIds, getJstMidnightUtc(new Date())),
  ])
  return Promise.all(
    stores.map((store) =>
      combineAggregates(
        store,
        thumbnailUrlsByStoreId.get(store.id) ?? null,
        suggestionCounts.get(store.id) ?? 0,
      ),
    ),
  )
}
