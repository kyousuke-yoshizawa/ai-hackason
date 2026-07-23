// ⚠️ report ハンドラの非POST分岐（メールリンクからの着地ページ）は HTML を返す設計
// のため、統一エラー契約（{error, message} の JSON）の対象外として意図的に現状維持する
// （docs/architecture-audit/refactoring-handbook.md T09）。POST ハンドラのみ JSON 契約に統一する。
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { resolveCurrentCrowdLevel } from '../../backend/domains/crowd/getCurrentLevel.js'
import { listCrowdPatterns, replaceCrowdPatterns, upsertCrowdStatus, insertCrowdHistory } from '../../backend/domains/crowd/repository.js'
import { requireStoreAccess } from '../_http/requireStoreAccess.js'
import { requireMethod } from '../../backend/http/method.js'
import { sendError, zodError } from '../../backend/http/respond.js'
import { putCrowdPatternsBodySchema, reportCrowdBodySchema } from '../../backend/domains/crowd/schema.js'
import { verifyLinkToken, type LinkTokenPayload } from '../../backend/domains/email/linkToken.js'
import { getNotificationById, markNotificationLinkUsed } from '../../backend/domains/email/repository.js'
import { CROWD_LEVEL_LABEL, type CongestionLevel } from '../../backend/domains/crowd/types.js'
import { getPathSegments } from '../_http/segments.js'

const VALID_LEVELS = Object.keys(CROWD_LEVEL_LABEL) as CongestionLevel[]

// GET /api/crowd/current/:store_id — 直近30分以内のリアルタイム報告があれば優先し、
// 無ければ時間帯別の事前設定パターン（crowd_patterns）を返す。
async function handleCurrent(req: VercelRequest, res: VercelResponse, storeIdSegment: string | undefined) {
  if (typeof storeIdSegment !== 'string') {
    sendError(res, 400, 'validation_error', 'store_id is required')
    return
  }
  const storeId = storeIdSegment

  const result = await resolveCurrentCrowdLevel(storeId)
  return res.status(200).json(result)
}

// GET /api/crowd/patterns/:store_id — 店舗の曜日×時間帯パターン設定を取得（店舗管理者 or admin のみ）
//   存在する行のみを返す（7×24の欠損マス目は補完しない）。
// PUT /api/crowd/patterns/:store_id — 店舗のパターン設定を渡された内容で全件置き換える
//   body: [{ day_of_week: number|null, hour_of_day: number, level: 'low'|'medium'|'high' }, ...]
async function handlePatterns(req: VercelRequest, res: VercelResponse, storeIdSegment: string | undefined) {
  if (!requireMethod(req, res, ['GET', 'PUT'])) return

  if (typeof storeIdSegment !== 'string') {
    sendError(res, 400, 'validation_error', 'store_id is required')
    return
  }
  const storeId = storeIdSegment

  if (req.method === 'GET') {
    const userId = await requireStoreAccess(req, res, storeId)
    if (!userId) return

    const patterns = await listCrowdPatterns(storeId)
    return res.status(200).json(
      patterns.map((pattern) => ({
        day_of_week: pattern.dayOfWeek,
        hour_of_day: pattern.hourOfDay,
        level: pattern.level,
      })),
    )
  }

  const parsed = putCrowdPatternsBodySchema.safeParse(req.body)
  if (!parsed.success) {
    return zodError(res, parsed.error)
  }

  const userId = await requireStoreAccess(req, res, storeId)
  if (!userId) return

  await replaceCrowdPatterns(
    storeId,
    parsed.data.map((entry) => ({
      dayOfWeek: entry.day_of_week,
      hourOfDay: entry.hour_of_day,
      level: entry.level,
    })),
  )

  return res.status(200).json({ storeId, count: parsed.data.length })
}

// POST /api/crowd/report { store_id, level } （store_manager もしくは admin が認証ヘッダ x-user-id 付きで直接報告する場合）
async function handleReportPost(req: VercelRequest, res: VercelResponse) {
  const parsed = reportCrowdBodySchema.safeParse(req.body)
  if (!parsed.success) {
    return zodError(res, parsed.error)
  }
  const { store_id: storeId, level } = parsed.data

  const userId = await requireStoreAccess(req, res, storeId)
  if (!userId) return

  await upsertCrowdStatus(storeId, level, userId)
  await insertCrowdHistory(storeId, level, userId)

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
async function handleReport(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    return handleReportPost(req, res)
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

  const page = renderResultPage(
    200,
    'ご報告ありがとうございます',
    `混雑状況「${CROWD_LEVEL_LABEL[level as CongestionLevel]}」を記録しました。`,
  )
  return res.status(page.status).setHeader('Content-Type', 'text/html; charset=utf-8').send(page.html)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const segments = getPathSegments(req, '/api/crowd')

  if (segments[0] === 'current' && segments.length <= 2) {
    return handleCurrent(req, res, segments[1])
  }

  if (segments[0] === 'patterns' && segments.length <= 2) {
    return handlePatterns(req, res, segments[1])
  }

  if (segments.length === 1 && segments[0] === 'report') {
    return handleReport(req, res)
  }

  return sendError(res, 404, 'not_found', 'route not found')
}
