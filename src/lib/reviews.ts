import { api } from './api'
import { toApiResult } from './toApiResult'
import type { ApiResult, Review, ReviewStats, ReviewWithUser } from '../types/social'
import { EMPTY_REVIEW_STATS } from '../../shared/types/social'

export const REVIEW_COMMENT_MAX_LENGTH = 500

export async function createReview(
  userId: string,
  storeId: string,
  rating: number,
  comment: string
): Promise<ApiResult & { review?: Review }> {
  const result = await toApiResult(
    api.post<Review>('/api/reviews', { store_id: storeId, rating, comment }),
    'レビューの投稿に失敗しました'
  )
  return result.success ? { success: true, review: result.data } : result
}

export async function getStoreReviews(
  storeId: string
): Promise<ApiResult & { reviews: ReviewWithUser[] }> {
  const result = await toApiResult(
    api.get<{ data: ReviewWithUser[] }>(`/api/stores/${storeId}/reviews`),
    'レビュー一覧の取得に失敗しました'
  )
  return result.success ? { success: true, reviews: result.data.data } : { ...result, reviews: [] }
}

export async function getStoreReviewStats(
  storeId: string
): Promise<ApiResult & { stats: ReviewStats }> {
  const result = await toApiResult(
    api.get<ReviewStats>(`/api/stores/${storeId}/reviews/stats`),
    'レビュー統計の取得に失敗しました'
  )
  return result.success ? { success: true, stats: result.data } : { ...result, stats: EMPTY_REVIEW_STATS(storeId) }
}

export async function updateReview(
  reviewId: string,
  userId: string,
  rating: number,
  comment: string
): Promise<ApiResult & { review?: Review }> {
  const result = await toApiResult(
    api.put<Review>(`/api/reviews/${reviewId}`, { rating, comment }),
    'レビューの更新に失敗しました'
  )
  return result.success ? { success: true, review: result.data } : result
}

export async function deleteReview(reviewId: string, _userId: string, _isAdmin: boolean): Promise<ApiResult> {
  const result = await toApiResult(api.delete<void>(`/api/reviews/${reviewId}`), 'レビューの削除に失敗しました')
  return result.success ? { success: true } : result
}
