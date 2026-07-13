import { Router } from 'express'
import { requireAdminOrSelf, requireAuth } from '../middleware/auth.js'
import { sendError, zodError } from '../../backend/http/respond.js'
import { createLikeSchema } from '../../backend/domains/social/schema.js'
import {
  addLike,
  getStoreLikeCount,
  getUserLikes,
  isStoreLikedByUser,
  removeLikeByStore,
} from '../../backend/domains/social/likesRepository.js'

// POST/DELETE /api/likes、GET /api/likes/user/:userId にマウントする
export const likesRouter = Router()

likesRouter.post('/', requireAuth, async (req, res) => {
  const parsed = createLikeSchema.safeParse(req.body)
  if (!parsed.success) {
    return zodError(res, parsed.error)
  }

  try {
    const result = await addLike(req.authedUser!.id, parsed.data.store_id)
    if (result.duplicate) {
      return sendError(res, 409, 'already_liked', 'すでにいいね済みです')
    }
    res.status(201).json(result.like)
  } catch (error) {
    sendError(res, 500, 'internal_error', error instanceof Error ? error.message : 'unknown error')
  }
})

likesRouter.delete('/:storeId', requireAuth, async (req, res) => {
  try {
    await removeLikeByStore(req.authedUser!.id, req.params.storeId)
    res.json({ message: 'いいねを取り消しました' })
  } catch (error) {
    sendError(res, 500, 'internal_error', error instanceof Error ? error.message : 'unknown error')
  }
})

likesRouter.get('/user/:userId', requireAuth, requireAdminOrSelf('userId'), async (req, res) => {
  try {
    const likes = await getUserLikes(req.params.userId)
    res.json({ data: likes })
  } catch (error) {
    sendError(res, 500, 'internal_error', error instanceof Error ? error.message : 'unknown error')
  }
})

// GET /api/stores/:storeId/likes/count にマウントする（店舗管理系ルータと同じ /api/stores 配下）
export const storeLikesRouter = Router()

storeLikesRouter.get('/:storeId/likes/count', async (req, res) => {
  try {
    const count = await getStoreLikeCount(req.params.storeId)
    res.json({ count })
  } catch (error) {
    sendError(res, 500, 'internal_error', error instanceof Error ? error.message : 'unknown error')
  }
})

// LikeButton（現在は結線待ち。T13で結線予定）が自分のいいね状態を確認するために使用
storeLikesRouter.get('/:storeId/likes/mine', requireAuth, async (req, res) => {
  const result = await isStoreLikedByUser(req.authedUser!.id, req.params.storeId)
  res.json(result)
})
