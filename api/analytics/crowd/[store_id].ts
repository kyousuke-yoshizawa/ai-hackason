import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getCrowdAnalyticsForStore } from '../../../backend/domains/crowdAnalytics/repository.js'
import { requireStoreAccess } from '../../_http/requireStoreAccess.js'
import { requireStringParam } from '../../../backend/http/params.js'

// GET /api/analytics/crowd/:store_id?days=N — 日別の混雑分析データ取得（店舗管理者 or admin のみ）
// days を省略した場合は保存済みの全期間を返す。
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const storeId = requireStringParam(req, res, 'store_id')
  if (!storeId) return
  const { days } = req.query

  const userId = await requireStoreAccess(req, res, storeId)
  if (!userId) return

  const rows = await getCrowdAnalyticsForStore(storeId)
  const sorted = [...rows].sort((a, b) => (a.datePeriod < b.datePeriod ? -1 : a.datePeriod > b.datePeriod ? 1 : 0))

  const daysCount = typeof days === 'string' ? Number(days) : undefined
  const data = daysCount && Number.isFinite(daysCount) && daysCount > 0 ? sorted.slice(-daysCount) : sorted

  return res.status(200).json({ data })
}
