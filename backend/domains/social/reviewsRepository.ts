import { supabaseAdmin } from '../../db.js'
import { unwrap } from '../../unwrap.js'
import { EMPTY_REVIEW_STATS, type Review, type ReviewStats, type ReviewWithUser } from '../../../shared/types/social.js'

export type { Review, ReviewStats, ReviewWithUser }
export { EMPTY_REVIEW_STATS }

export async function createReview(
  userId: string,
  storeId: string,
  rating: number,
  comment: string,
): Promise<Review> {
  return unwrap(
    await supabaseAdmin.from('reviews').insert({ user_id: userId, store_id: storeId, rating, comment }).select().single(),
    'createReview',
  ) as Review
}

export async function getStoreReviews(storeId: string): Promise<ReviewWithUser[]> {
  const reviews = (unwrap(
    await supabaseAdmin.from('reviews').select('*').eq('store_id', storeId).order('created_at', { ascending: false }),
    'getStoreReviews',
  ) ?? []) as Review[]

  const userIds = [...new Set(reviews.map((review) => review.user_id))]
  const namesById = new Map<string, string>()
  if (userIds.length > 0) {
    const users = (unwrap(
      await supabaseAdmin.from('users').select('id, name').in('id', userIds),
      'getStoreReviews(users)',
    ) ?? []) as { id: string; name: string }[]
    for (const user of users) {
      namesById.set(user.id, user.name)
    }
  }

  return reviews.map((review) => ({
    ...review,
    users: namesById.has(review.user_id) ? { name: namesById.get(review.user_id)! } : null,
  }))
}

export async function getStoreReviewStats(storeId: string): Promise<ReviewStats> {
  const stats = unwrap(
    await supabaseAdmin.from('review_stats').select('*').eq('store_id', storeId).maybeSingle(),
    'getStoreReviewStats',
  ) as ReviewStats | null

  return stats ?? EMPTY_REVIEW_STATS(storeId)
}

export async function updateReview(
  reviewId: string,
  userId: string,
  rating: number,
  comment: string,
): Promise<Review | null> {
  const { data, error } = await supabaseAdmin
    .from('reviews')
    .update({ rating, comment, updated_at: new Date().toISOString() })
    .eq('id', reviewId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error || !data) return null
  return data as Review
}

export async function deleteReview(reviewId: string, userId: string, isAdmin: boolean): Promise<boolean> {
  const query = supabaseAdmin.from('reviews').delete().eq('id', reviewId)
  const result = isAdmin ? await query.select() : await query.eq('user_id', userId).select()
  const data = unwrap(result, 'deleteReview')

  return Array.isArray(data) && data.length > 0
}
