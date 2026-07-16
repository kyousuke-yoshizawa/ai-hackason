import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createReservation } from '../../backend/domains/reservations/repository.js'
import { validateReservationRequest } from '../../backend/domains/reservations/validation.js'
import { createReservationBodySchema } from '../../backend/domains/reservations/schema.js'
import { sendError, zodError } from '../../backend/http/respond.js'
import { requireMethod } from '../../backend/http/method.js'
import { withErrorHandling } from '../../backend/http/withErrorHandling.js'

// POST /api/reservations { store_id, user_id, reservation_date, reservation_time, party_size }
async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, ['POST'])) return

  const parsed = createReservationBodySchema.safeParse(req.body)
  if (!parsed.success) {
    return zodError(res, parsed.error)
  }
  const {
    store_id: storeId,
    user_id: userId,
    reservation_date: reservationDate,
    reservation_time: reservationTime,
    party_size: partySize,
  } = parsed.data

  const validation = await validateReservationRequest({
    storeId,
    reservationDate,
    reservationTime,
    partySize,
  })

  if (!validation.valid) {
    const statusByReason: Record<string, number> = {
      invalid_input: 400,
      store_not_found: 404,
      outside_business_hours: 422,
      too_soon: 422,
      capacity_exceeded: 409,
    }
    return sendError(res, statusByReason[validation.reason] ?? 422, validation.reason, validation.message)
  }

  const reservation = await createReservation({ storeId, userId, reservationDate, reservationTime, partySize })
  return res.status(201).json(reservation)
}

export default withErrorHandling(handler)
