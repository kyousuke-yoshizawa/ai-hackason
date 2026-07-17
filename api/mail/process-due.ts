import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAdmin } from '../_http/requireAdmin.js'
import { processDueNotifications } from '../../backend/domains/email/sender.js'
import { requireMethod } from '../../backend/http/method.js'
import { withErrorHandling } from '../../backend/http/withErrorHandling.js'

// POST /api/mail/process-due — 配信予定時刻を過ぎた email_notifications を送信する（admin のみ）
// #25（定期実行）から一定間隔で呼び出されることを想定した内部トリガー。
async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, ['POST'])) return

  if (!(await requireAdmin(req, res))) return

  const processedCount = await processDueNotifications()
  return res.status(200).json({ processedCount })
}

export default withErrorHandling(handler)
