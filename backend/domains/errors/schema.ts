import { z } from 'zod'

export const VALID_ERROR_STATUSES = ['new', 'reviewing', 'resolved'] as const

export const createErrorLogSchema = z.object({
  error_type: z.string().min(1),
  message: z.string().min(1),
  stack_trace: z.string().optional(),
  user_id: z.string().optional(),
  affected_resource_id: z.string().optional(),
})

export const updateErrorStatusSchema = z.object({
  status: z.enum(VALID_ERROR_STATUSES),
})
