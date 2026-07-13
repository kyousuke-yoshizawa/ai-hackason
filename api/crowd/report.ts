import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyLinkToken, type LinkTokenPayload } from '../_lib/email/linkToken'
import { getNotificationById, markNotificationLinkUsed } from '../_lib/email/repository'
import { upsertCrowdStatus, insertCrowdHistory } from '../_lib/crowd/repository'
import { requireStoreAccess } from '../_lib/requireStoreAccess'
import type { CongestionLevel } from '../_lib/email/templates'

const VALID_LEVELS: CongestionLevel[] = ['low', 'medium', 'high']

// POST /api/crowd/report { store_id, level } （store_manager もしくは admin が認証ヘッダ x-user-id 付きで直接報告する場合）
async function handlePost(req: VercelRequest, res: VercelResponse) {
  const { store_id: storeId, level } = req.body ?? {}

  if (typeof storeId !== 'string' || typeof level !== 'string' || !VALID_LEVELS.includes(level as CongestionLevel)) {
    return res.status(400).json({ error: 'store_id and a valid level are required' })
  }

  const userId = await requireStoreAccess(req, res, storeId)
  if (!userId) return

  await upsertCrowdStatus(storeId, level as CongestionLevel, userId)
  await insertCrowdHistory(storeId, level as CongestionLevel, userId)

  return res.status(200).json({ storeId, level })
}

function renderResultPage(status: number, title: string, message: string) {
  return {
    status,
    html: `<!DOCTYPE html>
<html lang="ja">
  <body style="font-family:'Hiragino Sans',sans-serif;padding:32px;text-align:center;">
    <h1 style="font-size:18px;">${title}</h1>
    <p style="font-size:14px;color:#3f3f46;">${message}</p>
  </body>
</html>`,
  }
}

// GET  /api/crowd/report?store_id=XXX&level=Y&token=ZZZZ — メール本文の3ボタンからの1回限りリンク
// POST /api/crowd/report { store_id, level } — 店舗管理者/adminが直接報告する場合
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    return handlePost(req, res)
  }

  const { store_id: storeId, level, token } = req.query

  if (typeof storeId !== 'string' || typeof level !== 'string' || typeof token !== 'string') {
    const page = renderResultPage(400, 'リンクが不正です', 'store_id, level, token は必須です。')
    return res.status(page.status).setHeader('Content-Type', 'text/html; charset=utf-8').send(page.html)
  }

  if (!VALID_LEVELS.includes(level as CongestionLevel)) {
    const page = renderResultPage(400, 'リンクが不正です', '混雑レベルの指定が不正です。')
    return res.status(page.status).setHeader('Content-Type', 'text/html; charset=utf-8').send(page.html)
  }

  const verifyResult = verifyLinkToken(token)
  if (!verifyResult.valid) {
    const messages: Record<typeof verifyResult.reason, string> = {
      malformed: 'リンクの形式が不正です。',
      invalid_signature: 'リンクが改ざんされている可能性があります。',
      expired: 'リンクの有効期限（30分）が切れています。もう一度通知メールをお待ちください。',
    }
    const page = renderResultPage(401, 'リンクが無効です', messages[verifyResult.reason])
    return res.status(page.status).setHeader('Content-Type', 'text/html; charset=utf-8').send(page.html)
  }

  const payload: LinkTokenPayload = verifyResult.payload
  if (payload.storeId !== storeId) {
    const page = renderResultPage(403, 'リンクが無効です', '店舗情報が一致しません。')
    return res.status(page.status).setHeader('Content-Type', 'text/html; charset=utf-8').send(page.html)
  }

  const notification = await getNotificationById(payload.notificationId)
  if (!notification) {
    const page = renderResultPage(404, 'リンクが無効です', '通知情報が見つかりません。')
    return res.status(page.status).setHeader('Content-Type', 'text/html; charset=utf-8').send(page.html)
  }
  if (notification.linkUsedAt) {
    const page = renderResultPage(410, 'このリンクは既に使用されています', '混雑状況の報告は1回のみ受け付けています。')
    return res.status(page.status).setHeader('Content-Type', 'text/html; charset=utf-8').send(page.html)
  }

  await upsertCrowdStatus(storeId, level as CongestionLevel, payload.managerId)
  await insertCrowdHistory(storeId, level as CongestionLevel, payload.managerId)
  await markNotificationLinkUsed(payload.notificationId)

  const LEVEL_LABEL: Record<CongestionLevel, string> = {
    low: '空いてる',
    medium: '普通',
    high: '混んでる',
  }
  const page = renderResultPage(
    200,
    'ご報告ありがとうございます',
    `混雑状況「${LEVEL_LABEL[level as CongestionLevel]}」を記録しました。`,
  )
  return res.status(page.status).setHeader('Content-Type', 'text/html; charset=utf-8').send(page.html)
}
