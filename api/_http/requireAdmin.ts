import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAdmin as requireAdminUser } from '../../backend/auth/authz.js'
import { sendError } from '../../backend/http/respond.js'
import { getRequesterId } from './getRequesterId.js'

export const requireAdmin = async (
  req: VercelRequest,
  res: VercelResponse,
): Promise<string | null> => {
  const userId = getRequesterId(req, res)
  if (!userId) return null

  const user = await requireAdminUser(userId)
  if (!user) {
    sendError(res, 403, 'forbidden', 'admin role required')
    return null
  }

  return user.id
}
