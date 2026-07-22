import { z } from 'zod'

// sub_area: エリア内の4区画のいずれか（docs/database/016_add_store_attributes.sql参照）
const subAreaSchema = z.enum(['駅前エリア', '商店街エリア', '公園エリア', '広場エリア'])

export const createStoreSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  x: z.number(),
  y: z.number(),
  open_time: z.string().optional(),
  close_time: z.string().optional(),
  price_min: z.number().optional(),
  price_max: z.number().optional(),
  tags: z.array(z.string().max(20)).max(10).optional(),
  closed_days: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  last_order_time: z.string().optional(),
  description: z.string().max(500).optional(),
  sub_area: subAreaSchema.nullable().optional(),
})

export const updateStoreSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  open_time: z.string().optional(),
  close_time: z.string().optional(),
  price_min: z.number().optional(),
  price_max: z.number().optional(),
  tags: z.array(z.string().max(20)).max(10).optional(),
  closed_days: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  last_order_time: z.string().optional(),
  description: z.string().max(500).optional(),
  sub_area: subAreaSchema.nullable().optional(),
})
