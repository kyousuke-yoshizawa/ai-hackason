import { z } from 'zod'

export const generatePlanRequestSchema = z.object({
  message: z.string().min(1).max(1000),
  party_size: z.number().int().min(1).max(20).optional(),
  budget: z.number().int().min(0).optional(),
  time_limit: z.string().max(50).optional(),
})

export const planStopSchema = z.object({
  store_id: z.string().min(1),
  store_name: z.string().min(1),
  start_time: z.string().min(1),
  end_time: z.string().min(1),
  travel_note: z.string(),
  reason: z.string(),
})

export const planCandidateSchema = z.object({
  label: z.string().min(1),
  stops: z.array(planStopSchema).min(1),
  score: z.number().min(0).max(1),
  summary: z.string(),
})

export const generatePlanResponseSchema = z.object({
  intent: z.object({
    desires: z.array(z.string()),
    party_size: z.number().nullable().optional(),
    budget: z.number().nullable().optional(),
    time_limit: z.string().nullable().optional(),
  }),
  candidates: z.array(planCandidateSchema).min(1),
})

export type GeneratePlanRequest = z.infer<typeof generatePlanRequestSchema>
export type PlanStop = z.infer<typeof planStopSchema>
export type PlanCandidate = z.infer<typeof planCandidateSchema>
export type GeneratePlanResponse = z.infer<typeof generatePlanResponseSchema>
