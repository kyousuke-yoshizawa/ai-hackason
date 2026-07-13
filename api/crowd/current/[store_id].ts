import type { VercelRequest, VercelResponse } from '@vercel/node'
import { resolveCurrentCrowdLevel } from '../../../backend/domains/crowd/getCurrentLevel.js'

// GET /api/crowd/current/:store_id — 直近30分以内のリアルタイム報告があれば優先し、
// 無ければ時間帯別の事前設定パターン（crowd_patterns）を返す。
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { store_id: storeId } = req.query

  if (typeof storeId !== 'string') {
    return res.status(400).json({ error: 'store_id is required' })
  }

  const result = await resolveCurrentCrowdLevel(storeId)
  return res.status(200).json(result)
}
