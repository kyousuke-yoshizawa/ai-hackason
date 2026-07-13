import { supabaseAdmin } from '../../db.js'

export interface Review {
  id: string
  user_id: string
  store_id: string
  rating: number
  comment: string | null
  created_at: string
  updated_at: string
}

export interface ReviewWithUser extends Review {
  users: { name: string } | null
}

export interface ReviewStats {
  store_id: string
  avg_rating: number
  review_count: number
  last_updated: string
}

export const EMPTY_REVIEW_STATS = (storeId: string): ReviewStats => ({
  store_id: storeId,
  avg_rating: 0,
  review_count: 0,
  last_updated: '',
})

export async function createReview(
  userId: string,
  storeId: string,
  rating: number,
  comment: string,
): Promise<Review> {
  const { data, error } = await supabaseAdmin
    .from('reviews')
    .insert({ user_id: userId, store_id: storeId, rating, comment })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Review
}

export async function getStoreReviews(storeId: string): Promise<ReviewWithUser[]> {
  const { data, error } = await supabaseAdmin
    .from('reviews')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  const reviews = (data ?? []) as Review[]

  const userIds = [...new Set(reviews.map((review) => review.user_id))]
  const namesById = new Map<string, string>()
  if (userIds.length > 0) {
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, name')
      .in('id', userIds)
    if (usersError) throw new Error(usersError.message)
    for (const user of (users ?? []) as { id: string; name: string }[]) {
      namesById.set(user.id, user.name)
    }
  }

  return reviews.map((review) => ({
    ...review,
    users: namesById.has(review.user_id) ? { name: namesById.get(review.user_id)! } : null,
  }))
}

export async function getStoreReviewStats(storeId: string): Promise<ReviewStats> {
  const { data, error } = await supabaseAdmin
    .from('review_stats')
    .select('*')
    .eq('store_id', storeId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return (data as ReviewStats) ?? EMPTY_REVIEW_STATS(storeId)
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
  const { data, error } = isAdmin ? await query.select() : await query.eq('user_id', userId).select()

  if (error) throw new Error(error.message)
  return Array.isArray(data) && data.length > 0
}
