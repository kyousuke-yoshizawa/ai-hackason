import type { VercelRequest, VercelResponse } from '@vercel/node'
import { listUserReservations } from '../../_lib/reservations/repository.js'

// GET /api/reservations/user/:user_id
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { user_id: userId } = req.query

  if (typeof userId !== 'string') {
    return res.status(400).json({ error: 'user_id is required' })
  }

  const reservations = await listUserReservations(userId)
  return res.status(200).json(reservations)
}
