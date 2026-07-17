import type { VercelRequest, VercelResponse } from '@vercel/node'
import { AREA_NAME, LANDMARKS } from '../../backend/domains/area/landmarks.js'
import { sendError } from '../../backend/http/respond.js'

// GET /api/area — 架空エリア「ことこと町」のエリア名・ランドマーク一覧を返す。
// ランドマークは変更頻度が低いコード定数（backend/domains/area/landmarks.ts）のため、
// DB読み取りは発生しない。認証不要・読み取り専用。
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return sendError(res, 405, 'method_not_allowed', 'Method not allowed')
  }

  return res.status(200).json({ area_name: AREA_NAME, landmarks: LANDMARKS })
}
