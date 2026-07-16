import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireStoreAccess as requireStoreAccessUser } from '../../backend/auth/authz.js'
import { sendError } from '../../backend/http/respond.js'
import { getRequesterId } from './getRequesterId.js'

export const requireStoreAccess = async (
  req: VercelRequest,
  res: VercelResponse,
  storeId: string,
): Promise<string | null> => {
  const userId = getRequesterId(req, res)
  if (!userId) return null

  const user = await requireStoreAccessUser(userId, storeId)
  if (!user) {
    sendError(res, 403, 'forbidden', 'store manager or admin role required')
    return null
  }

  return user.id
}
