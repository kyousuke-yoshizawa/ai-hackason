import { z } from 'zod'

// backend/domains/crowd/types.ts の CongestionLevel と値を揃える
export const congestionLevelSchema = z.enum(['low', 'medium', 'high'])

// POST /api/crowd/report の req.body（店舗管理者/adminが直接報告する場合）
export const reportCrowdBodySchema = z.object({
  store_id: z.string().min(1),
  level: congestionLevelSchema,
})
