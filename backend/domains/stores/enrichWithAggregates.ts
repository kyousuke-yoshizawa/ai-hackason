import { resolveCurrentCrowdLevel } from '../crowd/getCurrentLevel.js'
import type { CongestionLevel } from '../crowd/types.js'
import { getStoreLikeCount } from '../social/likesRepository.js'
import { getStoreReviewStats } from '../social/reviewsRepository.js'

export interface StoreAggregates {
  like_count: number
  avg_rating: number
  review_count: number
  crowd_level: CongestionLevel | null
}

/**
 * 店舗検索・絞込（Issue #84, #85）のために、いいね数・レビュー評価・現在の混雑度を
 * 店舗ごとに並行取得して結合する。店舗一覧APIでのみ使用する想定（店舗数がハッカソン
 * 規模である前提でN+1を許容している）。
 */
export async function enrichStoreWithAggregates<T extends { id: string }>(
  store: T,
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
  }
}

export async function enrichStoresWithAggregates<T extends { id: string }>(
  stores: T[],
): Promise<(T & StoreAggregates)[]> {
  return Promise.all(stores.map((store) => enrichStoreWithAggregates(store)))
}
