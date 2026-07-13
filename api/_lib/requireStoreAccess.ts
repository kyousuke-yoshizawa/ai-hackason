import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireStoreAccess as requireStoreAccessUser } from './authz.js'

export const requireStoreAccess = async (
  req: VercelRequest,
  res: VercelResponse,
  storeId: string,
): Promise<string | null> => {
  const userId = req.headers['x-user-id']

  if (!userId || typeof userId !== 'string') {
    res.status(401).json({ error: 'x-user-id header is required' })
    return null
  }

  const user = await requireStoreAccessUser(userId, storeId)
  if (!user) {
    res.status(403).json({ error: 'store manager or admin role required' })
    return null
  }

  return user.id
}
