import type { VercelRequest, VercelResponse } from '@vercel/node'
import { listCrowdPatterns, replaceCrowdPatterns } from '../../../backend/domains/crowd/repository.js'
import { requireStoreAccess } from '../../_http/requireStoreAccess.js'
import { requireStringParam } from '../../../backend/http/params.js'
import { requireMethod } from '../../../backend/http/method.js'
import { zodError } from '../../../backend/http/respond.js'
import { putCrowdPatternsBodySchema } from '../../../backend/domains/crowd/schema.js'

// GET /api/crowd/patterns/:store_id — 店舗の曜日×時間帯パターン設定を取得（店舗管理者 or admin のみ）
//   存在する行のみを返す（7×24の欠損マス目は補完しない）。
// PUT /api/crowd/patterns/:store_id — 店舗のパターン設定を渡された内容で全件置き換える
//   body: [{ day_of_week: number|null, hour_of_day: number, level: 'low'|'medium'|'high' }, ...]
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, ['GET', 'PUT'])) return

  const storeId = requireStringParam(req, res, 'store_id')
  if (!storeId) return

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
