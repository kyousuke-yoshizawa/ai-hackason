import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { sendError, zodError } from '../../backend/http/respond.js'
import { asyncHandler } from '../../backend/http/asyncHandler.js'
import { createReviewSchema, updateReviewSchema } from '../../backend/domains/social/schema.js'
import {
  createReview,
  deleteReview,
  getStoreReviewStats,
  getStoreReviews,
  updateReview,
} from '../../backend/domains/social/reviewsRepository.js'

// POST /api/reviews、PUT/DELETE /api/reviews/:id にマウントする
export const reviewsRouter = Router()

reviewsRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = createReviewSchema.safeParse(req.body)
    if (!parsed.success) {
      return zodError(res, parsed.error)
    }

    const { store_id: storeId, rating, comment } = parsed.data
    const review = await createReview(req.authedUser!.id, storeId, rating, comment)
    res.status(201).json(review)
  }),
)

reviewsRouter.put(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = updateReviewSchema.safeParse(req.body)
    if (!parsed.success) {
      return zodError(res, parsed.error)
    }

    const { rating, comment } = parsed.data
    const review = await updateReview(req.params.id, req.authedUser!.id, rating, comment)
    if (!review) {
      return sendError(res, 404, 'not_found', 'レビューが見つかりません')
    }
    res.json(review)
  }),
)

reviewsRouter.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const isAdmin = req.authedUser!.role === 'admin'
    const deleted = await deleteReview(req.params.id, req.authedUser!.id, isAdmin)
    if (!deleted) {
      return sendError(res, 404, 'not_found', 'レビューが見つかりません')
    }
    res.json({ message: 'レビューを削除しました' })
  }),
)

// GET /api/stores/:storeId/reviews、/api/stores/:storeId/reviews/stats にマウントする
export const storeReviewsRouter = Router()

storeReviewsRouter.get(
  '/:storeId/reviews',
  asyncHandler(async (req, res) => {
    const reviews = await getStoreReviews(req.params.storeId)
    res.json({ data: reviews })
  }),
)

storeReviewsRouter.get(
  '/:storeId/reviews/stats',
  asyncHandler(async (req, res) => {
    const stats = await getStoreReviewStats(req.params.storeId)
    res.json(stats)
  }),
)
