import type { VercelRequest, VercelResponse } from '@vercel/node'
import { cancelReservation, getReservationById } from '../_lib/reservations/repository.js'
import { requireStoreAccess } from '../_lib/requireStoreAccess.js'

// PUT /api/reservations/:id — 予約キャンセル（本人、店舗責任者、adminのみ）
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', 'PUT')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id } = req.query
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'id is required' })
  }

  const reservation = await getReservationById(id)
  if (!reservation) {
    return res.status(404).json({ error: 'reservation not found' })
  }

  const requesterId = req.headers['x-user-id']
  const isOwner = typeof requesterId === 'string' && requesterId === reservation.userId
  if (!isOwner) {
    const userId = await requireStoreAccess(req, res, reservation.storeId)
    if (!userId) return
  }

  if (reservation.status === 'cancelled') {
    return res.status(409).json({ error: 'reservation is already cancelled' })
  }

  const cancelled = await cancelReservation(id)
  return res.status(200).json(cancelled)
}
