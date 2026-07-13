import type { VercelRequest, VercelResponse } from '@vercel/node'
import { listUserReservations } from '../../../backend/domains/reservations/repository.js'
import { sendError } from '../../../backend/http/respond.js'

// GET /api/reservations/user/:user_id
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { user_id: userId } = req.query

  if (typeof userId !== 'string') {
    return sendError(res, 400, 'validation_error', 'user_id is required')
  }

  const reservations = await listUserReservations(userId)
  return res.status(200).json(reservations)
}
