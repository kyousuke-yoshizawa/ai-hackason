import { z } from 'zod'

export const createStoreSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  x: z.number(),
  y: z.number(),
  open_time: z.string().optional(),
  close_time: z.string().optional(),
  price_min: z.number().optional(),
  price_max: z.number().optional(),
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
})
