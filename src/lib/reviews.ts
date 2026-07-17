import { api, ApiError } from './api'
import type { ApiResult, Review, ReviewStats, ReviewWithUser } from '../types/social'
import { EMPTY_REVIEW_STATS } from '../../shared/types/social'

export const REVIEW_COMMENT_MAX_LENGTH = 500

export async function createReview(
  userId: string,
  storeId: string,
  rating: number,
  comment: string
): Promise<ApiResult & { review?: Review }> {
  try {
    const review = await api.post<Review>('/api/reviews', { store_id: storeId, rating, comment })
    return { success: true, review }
  } catch (error) {
    return { success: false, message: error instanceof ApiError ? error.message : 'レビューの投稿に失敗しました' }
  }
}

export async function getStoreReviews(
  storeId: string
): Promise<ApiResult & { reviews: ReviewWithUser[] }> {
  try {
    const { data } = await api.get<{ data: ReviewWithUser[] }>(`/api/stores/${storeId}/reviews`)
    return { success: true, reviews: data }
  } catch (error) {
    return {
      success: false,
      message: error instanceof ApiError ? error.message : 'レビュー一覧の取得に失敗しました',
      reviews: [],
    }
  }
}

export async function getStoreReviewStats(
  storeId: string
): Promise<ApiResult & { stats: ReviewStats }> {
  const empty: ReviewStats = EMPTY_REVIEW_STATS(storeId)
  try {
    const stats = await api.get<ReviewStats>(`/api/stores/${storeId}/reviews/stats`)
    return { success: true, stats }
  } catch (error) {
    return {
      success: false,
      message: error instanceof ApiError ? error.message : 'レビュー統計の取得に失敗しました',
      stats: empty,
    }
  }
}

export async function updateReview(
  reviewId: string,
  userId: string,
  rating: number,
  comment: string
): Promise<ApiResult & { review?: Review }> {
  try {
    const review = await api.put<Review>(`/api/reviews/${reviewId}`, { rating, comment })
    return { success: true, review }
  } catch (error) {
    return { success: false, message: error instanceof ApiError ? error.message : 'レビューの更新に失敗しました' }
  }
}

export async function deleteReview(reviewId: string, _userId: string, _isAdmin: boolean): Promise<ApiResult> {
  try {
    await api.delete<void>(`/api/reviews/${reviewId}`)
    return { success: true }
  } catch (error) {
    return { success: false, message: error instanceof ApiError ? error.message : 'レビューの削除に失敗しました' }
  }
}
