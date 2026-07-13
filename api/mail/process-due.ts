import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAdmin } from '../_http/requireAdmin.js'
import { processDueNotifications } from '../../backend/domains/email/sender.js'
import { sendError } from '../../backend/http/respond.js'

// POST /api/mail/process-due — 配信予定時刻を過ぎた email_notifications を送信する（admin のみ）
// #25（定期実行）から一定間隔で呼び出されることを想定した内部トリガー。
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendError(res, 405, 'method_not_allowed', 'Method not allowed')
  }

  if (!(await requireAdmin(req, res))) return

  try {
    const processedCount = await processDueNotifications()
    return res.status(200).json({ processedCount })
  } catch (error) {
    return sendError(res, 500, 'internal_error', error instanceof Error ? error.message : 'unknown error')
  }
}
