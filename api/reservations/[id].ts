import type { VercelRequest, VercelResponse } from '@vercel/node'
import { cancelReservation, getReservationById } from '../../backend/domains/reservations/repository.js'
import { requireStoreAccess } from '../_http/requireStoreAccess.js'
import { sendError } from '../../backend/http/respond.js'

// PUT /api/reservations/:id — 予約キャンセル（本人、店舗責任者、adminのみ）
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', 'PUT')
    return sendError(res, 405, 'method_not_allowed', 'Method not allowed')
  }

  const { id } = req.query
  if (typeof id !== 'string') {
    return sendError(res, 400, 'validation_error', 'id is required')
  }

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
