import type { VercelRequest, VercelResponse } from '@vercel/node'
import { cancelReservation, getReservationById } from '../../backend/domains/reservations/repository.js'
import { requireStoreAccess } from '../_http/requireStoreAccess.js'
import { sendError } from '../../backend/http/respond.js'
import { requireMethod } from '../../backend/http/method.js'
import { requireStringParam } from '../../backend/http/params.js'

// PUT /api/reservations/:id — 予約キャンセル（本人、店舗責任者、adminのみ）
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, ['PUT'])) return

  const id = requireStringParam(req, res, 'id')
  if (!id) return

  const reservation = await getReservationById(id)
  if (!reservation) {
    return sendError(res, 404, 'not_found', 'reservation not found')
  }

  const requesterId = req.headers['x-user-id']
  const isOwner = typeof requesterId === 'string' && requesterId === reservation.userId
  if (!isOwner) {
    const userId = await requireStoreAccess(req, res, reservation.storeId)
    if (!userId) return
  }

  if (reservation.status === 'cancelled') {
    return sendError(res, 409, 'already_cancelled', 'reservation is already cancelled')
  }

  const cancelled = await cancelReservation(id)
  return res.status(200).json(cancelled)
}
