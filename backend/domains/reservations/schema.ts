import { z } from 'zod'

// POST /api/reservations の req.body（スネークケース、ワイヤーフォーマット）
export const createReservationBodySchema = z.object({
  store_id: z.string().min(1),
  user_id: z.string().min(1),
  reservation_date: z.string().min(1),
  reservation_time: z.string().min(1),
  party_size: z.number(),
})

// GET /api/reservations/availability の req.query（クエリ文字列は常に string）
export const availabilityQuerySchema = z.object({
  store_id: z.string().min(1),
  reservation_date: z.string().min(1),
  reservation_time: z.string().min(1),
  party_size: z.coerce.number().optional().default(1),
})
