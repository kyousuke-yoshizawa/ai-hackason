import { z } from 'zod'

export const generatePlanRequestSchema = z.object({
  message: z.string().min(1).max(1000),
  party_size: z.number().int().min(1).max(20).optional(),
  budget: z.number().int().min(0).optional(),
  time_limit: z.string().max(50).optional(),
  // U006（プラン修正リクエスト対応）: セッション内の会話履歴。DB永続化はせず、
  // 呼び出し側（フロント）がリクエストの都度この配列で過去のやり取りを渡す前提。
  // このエンドポイントは認証・レート制限がない（既存の制約）ため、contentの長さを
  // 無制限にするとhistory最大10件×無制限長でClaude API呼び出しのトークン量・コストを
  // 際限なく増幅できてしまう。assistant側は過去のプラン生成結果（JSON）を丸ごと
  // 積み戻すケースを想定し、messageのmax(1000)より余裕を持たせつつ上限を設ける
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(4000) }))
    .max(10)
    .optional(),
})

export const planStopSchema = z.object({
  store_id: z.string().min(1),
  store_name: z.string().min(1),
  start_time: z.string().min(1),
  end_time: z.string().min(1),
  travel_note: z.string(),
  reason: z.string(),
  // 以下は要件定義書v2 U005（プラン応答への詳細情報の追加）向けの追加フィールド。
  // 既存レスポンス（これらのフィールドを含まない）との後方互換のためすべて任意
  rating: z.number().min(0).max(5).nullable().optional(),
  open_time: z.string().nullable().optional(),
  close_time: z.string().nullable().optional(),
  crowd_note: z.string().nullable().optional(),
  // オファー機能（要件定義書v2 S004）は未実装のため、Claudeには常にnullを返させる
  offer_note: z.string().nullable().optional(),
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
