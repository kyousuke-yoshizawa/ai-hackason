import { supabase } from './supabase'
import type { ApiResult, Review, ReviewStats, ReviewWithUser } from '../types/social'

export const REVIEW_COMMENT_MAX_LENGTH = 500

function validateRatingAndComment(rating: number, comment: string): string | null {
  if (rating < 1 || rating > 5) {
    return '評価は1〜5で指定してください'
  }
  if (comment.length > REVIEW_COMMENT_MAX_LENGTH) {
    return `コメントは${REVIEW_COMMENT_MAX_LENGTH}文字以内で入力してください`
  }
  return null
}

export async function createReview(
  userId: string,
  storeId: string,
  rating: number,
  comment: string
): Promise<ApiResult & { review?: Review }> {
  const validationError = validateRatingAndComment(rating, comment)
  if (validationError) return { success: false, message: validationError }

  const { data, error } = await supabase
    .from('reviews')
    .insert({ user_id: userId, store_id: storeId, rating, comment })
    .select()
    .single()

  if (error) return { success: false, message: error.message }
  return { success: true, review: data as Review }
}

export async function getStoreReviews(
  storeId: string
): Promise<ApiResult & { reviews: ReviewWithUser[] }> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*, users(name)')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })

  if (error) return { success: false, message: error.message, reviews: [] }
  return { success: true, reviews: (data ?? []) as unknown as ReviewWithUser[] }
}

export async function getStoreReviewStats(
  storeId: string
): Promise<ApiResult & { stats: ReviewStats }> {
  const { data, error } = await supabase
    .from('review_stats')
    .select('*')
    .eq('store_id', storeId)
    .maybeSingle()

  const empty: ReviewStats = { store_id: storeId, avg_rating: 0, review_count: 0, last_updated: '' }

  if (error) return { success: false, message: error.message, stats: empty }
  return { success: true, stats: (data as ReviewStats) ?? empty }
}

export async function updateReview(
  reviewId: string,
  userId: string,
  rating: number,
  comment: string
): Promise<ApiResult & { review?: Review }> {
  const validationError = validateRatingAndComment(rating, comment)
  if (validationError) return { success: false, message: validationError }

  const { data, error } = await supabase
    .from('reviews')
    .update({ rating, comment, updated_at: new Date().toISOString() })
    .eq('id', reviewId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) return { success: false, message: error.message }
  return { success: true, review: data as Review }
}

export async function deleteReview(
  reviewId: string,
  userId: string,
  isAdmin: boolean
): Promise<ApiResult> {
  const query = supabase.from('reviews').delete().eq('id', reviewId)
  const { error } = isAdmin ? await query : await query.eq('user_id', userId)

  if (error) return { success: false, message: error.message }
  return { success: true }
}
