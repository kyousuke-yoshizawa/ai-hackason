import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAdmin as requireAdminUser } from '../../backend/auth/authz.js'
import { sendError } from '../../backend/http/respond.js'

export const requireAdmin = async (
  req: VercelRequest,
  res: VercelResponse,
): Promise<string | null> => {
  const userId = req.headers['x-user-id']

  if (!userId || typeof userId !== 'string') {
    sendError(res, 401, 'unauthorized', 'x-user-id header is required')
    return null
  }

  const user = await requireAdminUser(userId)
  if (!user) {
    sendError(res, 403, 'forbidden', 'admin role required')
    return null
  }

  return user.id
}
