import type { VercelRequest, VercelResponse } from '@vercel/node'
import { runCongestionNotificationCycle } from '../../backend/domains/notifications/congestionNotificationJob.js'
import { sendError } from '../../backend/http/respond.js'

// GET /api/cron/notify-congestion
// Vercel Cron（vercel.json の crons）から30分おきに呼び出される想定。
// 営業時間外に呼ばれないよう、cron式自体は営業時間帯に限定している。
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return sendError(res, 401, 'unauthorized', 'CRON_SECRET が一致しません')
  }

  try {
    const result = await runCongestionNotificationCycle()
    return res.status(200).json(result)
  } catch (error) {
    return sendError(res, 500, 'internal_error', error instanceof Error ? error.message : 'unknown error')
  }
}
