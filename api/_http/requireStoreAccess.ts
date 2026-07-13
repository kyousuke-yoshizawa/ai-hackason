import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireStoreAccess as requireStoreAccessUser } from '../../backend/auth/authz.js'
import { sendError } from '../../backend/http/respond.js'

export const requireStoreAccess = async (
  req: VercelRequest,
  res: VercelResponse,
  storeId: string,
): Promise<string | null> => {
  const userId = req.headers['x-user-id']

  if (!userId || typeof userId !== 'string') {
    sendError(res, 401, 'unauthorized', 'x-user-id header is required')
    return null
  }

  const user = await requireStoreAccessUser(userId, storeId)
  if (!user) {
    sendError(res, 403, 'forbidden', 'store manager or admin role required')
    return null
  }

  return user.id
}
