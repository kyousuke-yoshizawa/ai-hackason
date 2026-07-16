import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sendError } from './respond.js'

// Vercel Functions 用の async ハンドラを try/catch でラップし、未捕捉エラーを 500 の統一契約で返す。
export function withErrorHandling(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<unknown>,
): (req: VercelRequest, res: VercelResponse) => Promise<unknown> {
  return async (req, res) => {
    try {
      return await handler(req, res)
    } catch (error) {
      return sendError(res, 500, 'internal_error', error instanceof Error ? error.message : 'unknown error')
    }
  }
}
