export type { Like, StoreRef, LikeWithStore, Review, ReviewWithUser, ReviewStats } from '../../shared/types/social'
export { EMPTY_REVIEW_STATS } from '../../shared/types/social'

export interface ApiResult {
  success: boolean
  message?: string
}
