import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { sendError, zodError } from '../../backend/http/respond.js'
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

reviewsRouter.post('/', requireAuth, async (req, res) => {
  const parsed = createReviewSchema.safeParse(req.body)
  if (!parsed.success) {
    return zodError(res, parsed.error)
  }

  try {
    const { store_id: storeId, rating, comment } = parsed.data
    const review = await createReview(req.authedUser!.id, storeId, rating, comment)
    res.status(201).json(review)
  } catch (error) {
    sendError(res, 500, 'internal_error', error instanceof Error ? error.message : 'unknown error')
  }
})

reviewsRouter.put('/:id', requireAuth, async (req, res) => {
  const parsed = updateReviewSchema.safeParse(req.body)
  if (!parsed.success) {
    return zodError(res, parsed.error)
  }

  try {
    const { rating, comment } = parsed.data
    const review = await updateReview(req.params.id, req.authedUser!.id, rating, comment)
    if (!review) {
      return sendError(res, 404, 'not_found', 'レビューが見つかりません')
    }
    res.json(review)
  } catch (error) {
    sendError(res, 500, 'internal_error', error instanceof Error ? error.message : 'unknown error')
  }
})

reviewsRouter.delete('/:id', requireAuth, async (req, res) => {
  try {
    const isAdmin = req.authedUser!.role === 'admin'
    await deleteReview(req.params.id, req.authedUser!.id, isAdmin)
    res.json({ message: 'レビューを削除しました' })
  } catch (error) {
    sendError(res, 500, 'internal_error', error instanceof Error ? error.message : 'unknown error')
  }
})

// GET /api/stores/:storeId/reviews、/api/stores/:storeId/reviews/stats にマウントする
export const storeReviewsRouter = Router()

storeReviewsRouter.get('/:storeId/reviews', async (req, res) => {
  try {
    const reviews = await getStoreReviews(req.params.storeId)
    res.json({ data: reviews })
  } catch (error) {
    sendError(res, 500, 'internal_error', error instanceof Error ? error.message : 'unknown error')
  }
})

storeReviewsRouter.get('/:storeId/reviews/stats', async (req, res) => {
  try {
    const stats = await getStoreReviewStats(req.params.storeId)
    res.json(stats)
  } catch (error) {
    sendError(res, 500, 'internal_error', error instanceof Error ? error.message : 'unknown error')
  }
})
