export interface Like {
  id: string
  user_id: string
  store_id: string
  created_at: string
}

export interface StoreRef {
  id: string
  name: string
  category: string | null
}

export interface LikeWithStore extends Like {
  stores: StoreRef | null
}

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
