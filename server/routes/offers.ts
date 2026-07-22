import { Router } from 'express'
import { requireAuth, type AuthedUser } from '../middleware/auth.js'
import { sendError, zodError } from '../../backend/http/respond.js'
import { requireStringParam } from '../../backend/http/params.js'
import { buildPartialUpdate } from '../../backend/http/partialUpdate.js'
import { isStoreManager } from '../../backend/domains/crowd/repository.js'
import { createOfferSchema, updateOfferSchema } from '../../backend/domains/offers/schema.js'
import {
  createOffer,
  deleteOffer,
  getOfferById,
  listOffersByStore,
  updateOffer,
} from '../../backend/domains/offers/repository.js'

export const offersRouter = Router()

// admin または対象店舗の店舗管理者かを判定する。server/middleware/auth.ts の
// requireAdminOrStoreManager() は req.params からそのまま店舗IDを読む前提だが、
// このルータでは POST は body の store_id、PUT/DELETE は :id（オファーID）から
// repository経由で引いた store_id でしか店舗を特定できないため、そのミドルウェアは
// そのまま使えない。判定ソース（backend/domains/crowd/repository.ts の isStoreManager）は
// backend/auth/authz.ts・server/middleware/auth.ts と揃える。
async function canManageStore(authedUser: AuthedUser | undefined, storeId: string): Promise<boolean> {
  if (!authedUser) return false
  if (authedUser.role === 'admin') return true
  return isStoreManager(storeId, authedUser.id)
}

// GET /api/offers?store_id=... — 指定店舗のオファー一覧（認証不要。プラン閲覧同様に公開情報として扱う）
offersRouter.get('/', async (req, res) => {
  const storeId = requireStringParam(req, res, 'store_id')
  if (!storeId) return

  const offers = await listOffersByStore(storeId)
  res.json({ data: offers })
})

// POST /api/offers { store_id, description, start_time, end_time, weekdays_only?, is_active? }
offersRouter.post('/', requireAuth, async (req, res) => {
  const parsed = createOfferSchema.safeParse(req.body)
  if (!parsed.success) {
    return zodError(res, parsed.error)
  }

  if (!(await canManageStore(req.authedUser, parsed.data.store_id))) {
    return sendError(res, 403, 'forbidden', '権限がありません')
  }

  const offer = await createOffer(parsed.data)
  res.status(201).json(offer)
})

offersRouter.put('/:id', requireAuth, async (req, res) => {
  const existing = await getOfferById(req.params.id)
  if (!existing) {
    return sendError(res, 404, 'not_found', 'オファーが見つかりません')
  }

  if (!(await canManageStore(req.authedUser, existing.store_id))) {
    return sendError(res, 403, 'forbidden', '権限がありません')
  }

  const parsed = updateOfferSchema.safeParse(req.body)
  if (!parsed.success) {
    return zodError(res, parsed.error)
  }

  const updates = buildPartialUpdate(parsed.data, ['description', 'start_time', 'end_time', 'weekdays_only', 'is_active'])
  if (!updates) {
    return sendError(res, 400, 'no_updates', '更新内容がありません')
  }

  const updated = await updateOffer(req.params.id, updates)
  res.json(updated)
})

offersRouter.delete('/:id', requireAuth, async (req, res) => {
  const existing = await getOfferById(req.params.id)
  if (!existing) {
    return sendError(res, 404, 'not_found', 'オファーが見つかりません')
  }

  if (!(await canManageStore(req.authedUser, existing.store_id))) {
    return sendError(res, 403, 'forbidden', '権限がありません')
  }

  await deleteOffer(req.params.id)
  res.json({ message: 'オファーを削除しました' })
})
