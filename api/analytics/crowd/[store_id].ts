import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getCrowdAnalyticsForStore } from '../../_lib/crowdAnalytics/repository.js'
import { requireStoreAccess } from '../../_lib/requireStoreAccess.js'

// GET /api/analytics/crowd/:store_id?days=N — 日別の混雑分析データ取得（店舗管理者 or admin のみ）
// days を省略した場合は保存済みの全期間を返す。
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { store_id: storeId, days } = req.query

  if (typeof storeId !== 'string') {
    return res.status(400).json({ error: 'store_id is required' })
  }

  const userId = await requireStoreAccess(req, res, storeId)
  if (!userId) return

  const rows = await getCrowdAnalyticsForStore(storeId)
  const sorted = [...rows].sort((a, b) => (a.datePeriod < b.datePeriod ? -1 : a.datePeriod > b.datePeriod ? 1 : 0))

  const daysCount = typeof days === 'string' ? Number(days) : undefined
  const data = daysCount && Number.isFinite(daysCount) && daysCount > 0 ? sorted.slice(-daysCount) : sorted

  return res.status(200).json({ data })
}
