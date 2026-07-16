import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sendError } from './respond.js'

// CRON_SECRET 認証＋実行＋500ハンドリングをまとめた cron ハンドラのファクトリ。
// Vercel Cron（vercel.json の crons）から呼び出される想定。
export function createCronHandler<T>(
  job: () => Promise<T>,
): (req: VercelRequest, res: VercelResponse) => Promise<void> {
  return async (req, res) => {
    const authHeader = req.headers.authorization
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      sendError(res, 401, 'unauthorized', 'CRON_SECRET が一致しません')
      return
    }

    try {
      const result = await job()
      res.status(200).json(result)
    } catch (error) {
      sendError(res, 500, 'internal_error', error instanceof Error ? error.message : 'unknown error')
    }
  }
}
