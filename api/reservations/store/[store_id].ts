import type { VercelRequest, VercelResponse } from '@vercel/node'
import { listStoreReservations } from '../../../backend/domains/reservations/repository.js'
import { requireStoreAccess } from '../../_http/requireStoreAccess.js'
import { sendError } from '../../../backend/http/respond.js'

// GET /api/reservations/store/:store_id （店舗責任者またはadminのみ）
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { store_id: storeId } = req.query

  if (typeof storeId !== 'string') {
    return sendError(res, 400, 'validation_error', 'store_id is required')
  }

  const userId = await requireStoreAccess(req, res, storeId)
  if (!userId) return

  const reservations = await listStoreReservations(storeId)
  return res.status(200).json(reservations)
}
