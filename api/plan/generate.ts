import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabaseAdmin } from '../../backend/db.js'
import { sendError, zodError } from '../../backend/http/respond.js'
import { checkRateLimit } from '../../backend/http/rateLimit.js'
import { generatePlanRequestSchema, generatePlanResponseSchema } from '../../backend/domains/plan/schema.js'
import { buildPlanPrompt, buildStoreContexts, type StoreForPrompt } from '../../backend/domains/plan/promptBuilder.js'
import { generatePlan } from '../../backend/domains/plan/claudeClient.js'

const STORE_COLUMNS = 'id, name, category, x, y, open_time, close_time, price_min, price_max'

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
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendError(res, 405, 'method_not_allowed', 'Method not allowed')
  }

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
    .select(STORE_COLUMNS)
    .is('deleted_at', null)

  if (error) {
    return sendError(res, 500, 'internal_error', error.message)
  }
  if (!stores || stores.length === 0) {
    return sendError(res, 404, 'no_stores', '店舗マスタが空です')
  }

  try {
    const storeContexts = await buildStoreContexts(stores as StoreForPrompt[])
    const prompt = buildPlanPrompt(parsed.data, storeContexts)
    const rawResponse = await generatePlan(prompt)

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

    return res.status(200).json(validated.data)
  } catch (err) {
    return sendError(res, 502, 'claude_api_error', err instanceof Error ? err.message : 'Claude API呼び出しに失敗しました')
  }
}
