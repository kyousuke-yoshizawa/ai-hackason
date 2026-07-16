import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabaseAdmin } from '../../backend/db.js'
import { sendError, zodError } from '../../backend/http/respond.js'
import { generatePlanRequestSchema, generatePlanResponseSchema } from '../../backend/domains/plan/schema.js'
import {
  buildPlanSystemPrompt,
  buildPlanUserTurn,
  buildStoreContexts,
  type StoreForPrompt,
} from '../../backend/domains/plan/promptBuilder.js'
import { generatePlan } from '../../backend/domains/plan/claudeClient.js'

const STORE_COLUMNS = 'id, name, category, x, y, open_time, close_time, price_min, price_max'

// POST /api/plan/generate { message, party_size?, budget?, time_limit?, history? }
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendError(res, 405, 'method_not_allowed', 'Method not allowed')
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
    const systemPrompt = buildPlanSystemPrompt(storeContexts)
    // U006: セッション内の会話履歴（DB永続化なし）を過去ターンとして先頭に並べ、
    // 今回の要望を最後のuserメッセージとして追加する
    const messages = [
      ...(parsed.data.history ?? []).map((h) => ({ role: h.role, content: h.content })),
      { role: 'user' as const, content: buildPlanUserTurn(parsed.data) },
    ]
    const rawResponse = await generatePlan(systemPrompt, messages)

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
