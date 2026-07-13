import { z } from 'zod'

export const REVIEW_COMMENT_MAX_LENGTH = 500

export const createLikeSchema = z.object({
  store_id: z.string().min(1),
})

export const createReviewSchema = z.object({
  store_id: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(REVIEW_COMMENT_MAX_LENGTH).default(''),
})

export const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(REVIEW_COMMENT_MAX_LENGTH).default(''),
})
