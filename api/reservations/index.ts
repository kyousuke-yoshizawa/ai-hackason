import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createReservation } from '../_lib/reservations/repository'
import { validateReservationRequest } from '../_lib/reservations/validation'

// POST /api/reservations { store_id, user_id, reservation_date, reservation_time, party_size }
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const {
    store_id: storeId,
    user_id: userId,
    reservation_date: reservationDate,
    reservation_time: reservationTime,
    party_size: partySize,
  } = req.body ?? {}

  if (
    typeof storeId !== 'string' ||
    typeof userId !== 'string' ||
    typeof reservationDate !== 'string' ||
    typeof reservationTime !== 'string' ||
    typeof partySize !== 'number'
  ) {
    return res.status(400).json({
      error: 'store_id, user_id, reservation_date, reservation_time, party_size are required',
    })
  }

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
    return res
      .status(statusByReason[validation.reason] ?? 422)
      .json({ error: validation.reason, message: validation.message })
  }

  try {
    const reservation = await createReservation({ storeId, userId, reservationDate, reservationTime, partySize })
    return res.status(201).json(reservation)
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'unknown error' })
  }
}
