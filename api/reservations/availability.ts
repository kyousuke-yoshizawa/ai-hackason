import type { VercelRequest, VercelResponse } from '@vercel/node'
import { validateReservationRequest } from '../_lib/reservations/validation'

// GET /api/reservations/availability?store_id=X&reservation_date=YYYY-MM-DD&reservation_time=HH:MM&party_size=N
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const {
    store_id: storeId,
    reservation_date: reservationDate,
    reservation_time: reservationTime,
    party_size: partySizeRaw,
  } = req.query

  if (typeof storeId !== 'string' || typeof reservationDate !== 'string' || typeof reservationTime !== 'string') {
    return res.status(400).json({ error: 'store_id, reservation_date, reservation_time are required' })
  }

  const partySize = typeof partySizeRaw === 'string' ? Number(partySizeRaw) : 1

  const result = await validateReservationRequest({ storeId, reservationDate, reservationTime, partySize })

  if (result.valid) {
    return res.status(200).json({ available: true })
  }

  return res.status(200).json({ available: false, reason: result.reason, message: result.message })
}
