import type { VercelRequest, VercelResponse } from '@vercel/node'
import { validateReservationRequest } from '../../backend/domains/reservations/validation.js'
import { availabilityQuerySchema } from '../../backend/domains/reservations/schema.js'
import { zodError } from '../../backend/http/respond.js'

// GET /api/reservations/availability?store_id=X&reservation_date=YYYY-MM-DD&reservation_time=HH:MM&party_size=N
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const parsed = availabilityQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    return zodError(res, parsed.error)
  }
  const {
    store_id: storeId,
    reservation_date: reservationDate,
    reservation_time: reservationTime,
    party_size: partySize,
  } = parsed.data

  const result = await validateReservationRequest({ storeId, reservationDate, reservationTime, partySize })

  if (result.valid) {
    return res.status(200).json({ available: true })
  }

  // available:false は正常系レスポンス（エラーではない）ため sendError は使わない。
  // ただし reason/message のキー名は統一エラー契約と揃えている
  return res.status(200).json({ available: false, reason: result.reason, message: result.message })
}
