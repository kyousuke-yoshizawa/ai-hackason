import { z } from 'zod'

export const generatePlanRequestSchema = z.object({
  message: z.string().min(1).max(1000),
  party_size: z.number().int().min(1).max(20).optional(),
  budget: z.number().int().min(0).optional(),
  time_limit: z.string().max(50).optional(),
  // Issue #116（現在日時のプロンプト注入）: ユーザーが「19時から」等、開始時刻を明示指定した
  // 場合の制約。現在時刻より優先してプランの開始時刻に反映する（promptBuilder.formatConstraints参照）
  start_time: z.string().max(20).optional(),
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
  // Issue #135（オファーのプラン反映プレビュー）: 店舗管理者の「試す」ボタンからの
  // 呼び出しであることを示すフラグ。trueの場合、Issue #136のplan_suggestions記録を
  // スキップする（管理者の自己テストが「本日の提案回数」を水増ししてしまうのを防ぐ）
  preview: z.boolean().optional(),
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
  // オファー機能（要件定義書v2 S004）: 対象店舗に現在時刻適用中のオファーがある場合のみ
  // その内容が入る。無い場合はnull（promptBuilder.buildPlanSystemPrompt参照）
  offer_note: z.string().nullable().optional(),
  // Issue #123（U005拡張: プラン合計予算の概算表示と予算超過警告）向けの追加フィールド。
  // フロント側の予算計算に使う店舗の価格帯。既存フィールドと同様、後方互換のため任意
  price_min: z.number().nullable().optional(),
  price_max: z.number().nullable().optional(),
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
  // Issue #119（U004: 複数案対応）: promptBuilder側で2〜3案の生成を指示するが、
  // 単一の欲求しか読み取れない入力では候補が1案しか組めないこともあるためminは1を維持する。
  // 上限のみ4に設定し、5案以上の暴走的な生成を拒否する
  candidates: z.array(planCandidateSchema).min(1).max(4),
})

export type GeneratePlanRequest = z.infer<typeof generatePlanRequestSchema>
export type PlanStop = z.infer<typeof planStopSchema>
export type PlanCandidate = z.infer<typeof planCandidateSchema>
export type GeneratePlanResponse = z.infer<typeof generatePlanResponseSchema>

// Issue #118（Tool use）: Claudeにプランを強制的に構造化出力させるための入力スキーマ。
// generatePlanResponseSchema（zod）と形を一致させて保守するが、Anthropic SDKの
// tools[].input_schema はJSON Schemaのプレーンなオブジェクトを要求するため、
// zod-to-json-schema等の追加依存を導入せず手書きで維持する（重複はこの1箇所のみ）
// 型注釈はトップレベルのみ厳密化する（Anthropic SDKの Tool.InputSchema は
// type: 'object' をリテラルで要求する一方、properties は unknown 型のため、
// ネストした各schemaフィールドの型はここでは厳密化しなくてよい）
export const PLAN_RESULT_JSON_SCHEMA: {
  type: 'object'
  properties: Record<string, unknown>
  required: string[]
} = {
  type: 'object',
  properties: {
    intent: {
      type: 'object',
      properties: {
        desires: { type: 'array', items: { type: 'string' } },
        party_size: { type: ['number', 'null'] },
        budget: { type: ['number', 'null'] },
        time_limit: { type: ['string', 'null'] },
      },
      required: ['desires'],
    },
    candidates: {
      type: 'array',
      // Issue #119: zodスキーマ側のmax(4)と揃え、tool use経由でも5案以上を要求しない
      maxItems: 4,
      items: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          score: { type: 'number' },
          summary: { type: 'string' },
          stops: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                store_id: { type: 'string' },
                store_name: { type: 'string' },
                start_time: { type: 'string' },
                end_time: { type: 'string' },
                travel_note: { type: 'string' },
                reason: { type: 'string' },
                rating: { type: ['number', 'null'] },
                open_time: { type: ['string', 'null'] },
                close_time: { type: ['string', 'null'] },
                crowd_note: { type: ['string', 'null'] },
                offer_note: { type: ['string', 'null'] },
                price_min: { type: ['number', 'null'] },
                price_max: { type: ['number', 'null'] },
              },
              required: ['store_id', 'store_name', 'start_time', 'end_time', 'travel_note', 'reason'],
            },
          },
        },
        required: ['label', 'score', 'summary', 'stops'],
      },
    },
  },
  required: ['intent', 'candidates'],
}
