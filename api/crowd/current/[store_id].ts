import type { VercelRequest, VercelResponse } from '@vercel/node'
import { resolveCurrentCrowdLevel } from '../../../backend/domains/crowd/getCurrentLevel.js'
import { requireStringParam } from '../../../backend/http/params.js'

// GET /api/crowd/current/:store_id — 直近30分以内のリアルタイム報告があれば優先し、
// 無ければ時間帯別の事前設定パターン（crowd_patterns）を返す。
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const storeId = requireStringParam(req, res, 'store_id')
  if (!storeId) return

  const result = await resolveCurrentCrowdLevel(storeId)
  return res.status(200).json(result)
}
