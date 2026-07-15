import { z } from 'zod'

export const ALLOWED_ROLES = ['admin', 'store_manager', 'user'] as const

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  name: z.string().min(1),
  role: z.enum(ALLOWED_ROLES).default('user'),
})

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  password: z.string().min(1).optional(),
  role: z.enum(ALLOWED_ROLES).optional(),
})
