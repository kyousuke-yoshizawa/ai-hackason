import { z } from 'zod'

// docs/database/018_create_offers_table.sql の start_time/end_time（TIME型）に対応。
// このプロジェクトでは他のTIME型カラム（stores.open_time等）も一貫して "HH:MM" 文字列として
// 扱う（backend/domains/stores/schema.ts参照）ため、ここでも同じ規約に揃える
const timeStringSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'HH:MM形式で指定してください')

const timeRangeRefinement = <T extends { start_time?: string; end_time?: string }>(data: T): boolean => {
  if (data.start_time === undefined || data.end_time === undefined) return true
  return data.start_time < data.end_time
}

// zero-paddedな"HH:MM"同士の文字列比較は数値比較と同じ大小関係になるため、
// パース不要でそのまま比較できる
const TIME_RANGE_ISSUE = { message: 'start_time は end_time より前である必要があります', path: ['end_time'] }

export const createOfferSchema = z
  .object({
    store_id: z.string().min(1),
    description: z.string().min(1),
    start_time: timeStringSchema,
    end_time: timeStringSchema,
    weekdays_only: z.boolean().optional(),
    is_active: z.boolean().optional(),
  })
  .refine(timeRangeRefinement, TIME_RANGE_ISSUE)

export const updateOfferSchema = z
  .object({
    description: z.string().min(1).optional(),
    start_time: timeStringSchema.optional(),
    end_time: timeStringSchema.optional(),
    weekdays_only: z.boolean().optional(),
    is_active: z.boolean().optional(),
  })
  .refine(timeRangeRefinement, TIME_RANGE_ISSUE)

export type CreateOfferInput = z.infer<typeof createOfferSchema>
export type UpdateOfferInput = z.infer<typeof updateOfferSchema>
