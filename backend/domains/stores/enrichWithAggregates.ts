import { resolveCurrentCrowdLevel } from '../crowd/getCurrentLevel.js'
import type { CongestionLevel } from '../crowd/types.js'
import { getStoreLikeCount } from '../social/likesRepository.js'
import { getStoreReviewStats } from '../social/reviewsRepository.js'
import { getThumbnailUrlsForStores } from './storeThumbnails.js'

export interface StoreAggregates {
  like_count: number
  avg_rating: number
  review_count: number
  crowd_level: CongestionLevel | null
  thumbnail_url: string | null
}

/**
 * いいね数・レビュー評価・現在の混雑度・代表写真URLを1店舗分だけ結合する内部ヘルパー。
 * サムネイルURLは呼び出し元（単数/複数版）が取得したMapから渡してもらう
 * （store_mediaの一括取得をenrichStoreWithAggregates単体からも
 * enrichStoresWithAggregatesからも共有できるようにするため）。
 */
async function combineAggregates<T extends { id: string }>(
  store: T,
  thumbnailUrl: string | null,
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
    thumbnail_url: thumbnailUrl,
  }
}

/**
 * 店舗検索・絞込（Issue #84, #85）のために、いいね数・レビュー評価・現在の混雑度・
 * 代表写真URL（Issue #132）を店舗ごとに並行取得して結合する。店舗一覧APIでのみ
 * 使用する想定（店舗数がハッカソン規模である前提でN+1を許容している）。
 */
export async function enrichStoreWithAggregates<T extends { id: string }>(
  store: T,
): Promise<T & StoreAggregates> {
  const thumbnailUrlsByStoreId = await getThumbnailUrlsForStores([store.id])
  return combineAggregates(store, thumbnailUrlsByStoreId.get(store.id) ?? null)
}

export async function enrichStoresWithAggregates<T extends { id: string }>(
  stores: T[],
): Promise<(T & StoreAggregates)[]> {
  // store_mediaはstore_id配列で一括取得し、N+1を避ける（likesRepository.getUserLikes参照）
  const thumbnailUrlsByStoreId = await getThumbnailUrlsForStores(stores.map((store) => store.id))
  return Promise.all(
    stores.map((store) => combineAggregates(store, thumbnailUrlsByStoreId.get(store.id) ?? null)),
  )
}
