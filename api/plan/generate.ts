import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabaseAdmin } from '../../backend/db.js'
import { sendError, zodError } from '../../backend/http/respond.js'
import { requireMethod } from '../../backend/http/method.js'
import { checkRateLimit } from '../../backend/http/rateLimit.js'
import { generatePlanRequestSchema, generatePlanResponseSchema } from '../../backend/domains/plan/schema.js'
import { buildPlanPrompt, buildStoreContexts, type StoreForPrompt } from '../../backend/domains/plan/promptBuilder.js'
import { generatePlan } from '../../backend/domains/plan/claudeClient.js'
import { STORE_PLAN_COLUMNS } from '../../backend/domains/stores/columns.js'
import { getJstHourAndDay } from '../../backend/time.js'

// デモ期間中に緩めたい場合、再デプロイのみで調整できるよう環境変数化
const PLAN_RATE_LIMIT = Number(process.env.PLAN_RATE_LIMIT) || 10

function getRateLimitKey(req: VercelRequest): string {
  const userId = req.headers['x-user-id']
  if (typeof userId === 'string' && userId.length > 0) {
    return userId
  }
  const forwardedFor = req.headers['x-forwarded-for']
  const ip = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(',')[0]
  return ip?.trim() || 'unknown'
}

// POST /api/plan/generate { message, party_size?, budget?, time_limit? }
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, ['POST'])) return

  const rateLimit = checkRateLimit(getRateLimitKey(req), PLAN_RATE_LIMIT)
  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', String(rateLimit.retryAfterSec))
    return sendError(res, 429, 'rate_limited', 'リクエストが多すぎます。1分ほど待ってからお試しください')
  }

  const parsed = generatePlanRequestSchema.safeParse(req.body)
  if (!parsed.success) {
    return zodError(res, parsed.error)
  }

  const { data: stores, error } = await supabaseAdmin
    .from('stores')
    .select(STORE_PLAN_COLUMNS)
    .is('deleted_at', null)

  if (error) {
    return sendError(res, 500, 'internal_error', error.message)
  }
  if (!stores || stores.length === 0) {
    return sendError(res, 404, 'no_stores', '店舗マスタが空です')
  }

  // closed_days（0=日曜〜6=土曜、JSのDate.getDay()と同じ規約）に当日（JST基準）が含まれる
  // 店舗は定休日のためClaudeに渡す前に除外する（プロンプト側には表示しない「当日除外方式」）。
  // 実行環境のローカルタイムゾーンはUTCのため、getDay()を直接使うとJST日付境界でずれる
  const { day: todayDayOfWeek } = getJstHourAndDay(new Date())
  const openStores = (stores as StoreForPrompt[]).filter((store) => !(store.closed_days ?? []).includes(todayDayOfWeek))

  if (openStores.length === 0) {
    return sendError(res, 404, 'no_stores', '本日営業中の店舗がありません')
  }

  const startedAt = Date.now()
  try {
    const storeContexts = await buildStoreContexts(openStores)
    const prompt = buildPlanPrompt(parsed.data, storeContexts)
    const { result: rawResponse, usage, model } = await generatePlan(prompt)

    let json: unknown
    try {
      json = JSON.parse(rawResponse)
    } catch {
      return sendError(res, 502, 'invalid_ai_response', 'Claude APIの応答をJSONとして解釈できませんでした')
    }

    const validated = generatePlanResponseSchema.safeParse(json)
    if (!validated.success) {
      return zodError(res, validated.error, 502)
    }

    // 要件定義書v2 8章「コスト管理」対応。DBテーブルは増やさず、Vercelログで集計する最小実装
    console.log(
      JSON.stringify({
        evt: 'plan_generated',
        ms: Date.now() - startedAt,
        input_tokens: usage.inputTokens,
        output_tokens: usage.outputTokens,
        model,
        candidates: validated.data.candidates.length,
      })
    )

    return res.status(200).json(validated.data)
  } catch (err) {
    console.log(
      JSON.stringify({
        evt: 'plan_generation_failed',
        ms: Date.now() - startedAt,
        error: err instanceof Error ? err.message : 'unknown error',
      })
    )
    return sendError(res, 502, 'claude_api_error', err instanceof Error ? err.message : 'Claude API呼び出しに失敗しました')
  }
}
