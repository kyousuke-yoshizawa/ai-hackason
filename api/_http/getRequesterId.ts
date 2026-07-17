import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sendError } from '../../backend/http/respond.js'

// x-user-id ヘッダを取得。欠落・非文字列の場合は 401 を送出して null を返す。
export function getRequesterId(req: VercelRequest, res: VercelResponse): string | null {
  const userId = req.headers['x-user-id']

  if (!userId || typeof userId !== 'string') {
    sendError(res, 401, 'unauthorized', 'x-user-id header is required')
    return null
  }

  return userId
}
