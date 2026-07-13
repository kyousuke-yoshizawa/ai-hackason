import type { VercelRequest, VercelResponse } from '@vercel/node'
import { listStoreReservations } from '../../_lib/reservations/repository'
import { requireStoreAccess } from '../../_lib/requireStoreAccess'

// GET /api/reservations/store/:store_id （店舗責任者またはadminのみ）
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { store_id: storeId } = req.query

  if (typeof storeId !== 'string') {
    return res.status(400).json({ error: 'store_id is required' })
  }

  const userId = await requireStoreAccess(req, res, storeId)
  if (!userId) return

  const reservations = await listStoreReservations(storeId)
  return res.status(200).json(reservations)
}
