import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAdmin as requireAdminUser } from './authz.js'

export const requireAdmin = async (
  req: VercelRequest,
  res: VercelResponse,
): Promise<string | null> => {
  const userId = req.headers['x-user-id']

  if (!userId || typeof userId !== 'string') {
    res.status(401).json({ error: 'x-user-id header is required' })
    return null
  }

  const user = await requireAdminUser(userId)
  if (!user) {
    res.status(403).json({ error: 'admin role required' })
    return null
  }

  return user.id
}
