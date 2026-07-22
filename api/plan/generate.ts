import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabaseAdmin } from '../../backend/db.js'
import { sendError, zodError } from '../../backend/http/respond.js'
import { requireMethod } from '../../backend/http/method.js'
import { checkRateLimit } from '../../backend/http/rateLimit.js'
import { generatePlanRequestSchema, generatePlanResponseSchema } from '../../backend/domains/plan/schema.js'
import {
  buildPlanSystemPrompt,
  buildPlanUserTurn,
  buildStoreContexts,
  type OfferForPrompt,
  type StoreForPrompt,
} from '../../backend/domains/plan/promptBuilder.js'
import { generatePlan, PlanGenerationError, PlanResponseParseError } from '../../backend/domains/plan/claudeClient.js'
import { collectStoreIdsFromCandidates } from '../../backend/domains/plan/collectStoreIds.js'
import { STORE_PLAN_COLUMNS } from '../../backend/domains/stores/columns.js'
import { getJstHourAndDay } from '../../backend/time.js'
import { MOCK_PLAN_RESPONSE } from '../../backend/domains/plan/mockResponse.js'
import { listActiveOffers } from '../../backend/domains/offers/repository.js'
import { recordPlanSuggestions } from '../../backend/domains/stores/planSuggestions.js'

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

// POST /api/plan/generate { message, party_size?, budget?, time_limit?, history? }
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

  // Issue #121（モックモード）: ANTHROPIC_API_KEYが無い状態でもフロント開発・デモができるよう、
  // DB・Claude APIのどちらにも触れずに固定のプランを返す。本番（Vercel）環境変数には
  // 絶対に設定しないこと（.env.exampleのコメント参照）
  if (process.env.PLAN_MOCK === '1') {
    await new Promise((resolve) => setTimeout(resolve, 800)) // ローディングUI確認用の擬似遅延
    return res.status(200).json(MOCK_PLAN_RESPONSE)
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

  // now を1つに固定し、定休日判定・オファー適用判定・システムプロンプトの「現在日時」表示の
  // 間でJST基準の「今」がずれないようにする
  const now = new Date()

  // closed_days（0=日曜〜6=土曜、JSのDate.getDay()と同じ規約）に当日（JST基準）が含まれる
  // 店舗は定休日のためClaudeに渡す前に除外する（プロンプト側には表示しない「当日除外方式」）。
  // 実行環境のローカルタイムゾーンはUTCのため、getDay()を直接使うとJST日付境界でずれる
  const { day: todayDayOfWeek } = getJstHourAndDay(now)
  const openStores = (stores as Array<Omit<StoreForPrompt, 'offers'>>).filter(
    (store) => !(store.closed_days ?? []).includes(todayDayOfWeek),
  )

  if (openStores.length === 0) {
    return sendError(res, 404, 'no_stores', '本日営業中の店舗がありません')
  }

  const startedAt = Date.now()
  try {
    // オファー機能（要件定義書v2 S004）: 店舗ごとに問い合わせず、有効なオファーを一括取得して
    // 店舗IDでグルーピングする（#105のN+1回避パターンに合わせる）
    const activeOffers = await listActiveOffers()
    const offersByStore = new Map<string, OfferForPrompt[]>()
    for (const offer of activeOffers) {
      const list = offersByStore.get(offer.store_id) ?? []
      list.push({
        description: offer.description,
        start_time: offer.start_time,
        end_time: offer.end_time,
        weekdays_only: offer.weekdays_only,
        is_active: offer.is_active,
      })
      offersByStore.set(offer.store_id, list)
    }
    const storesWithOffers: StoreForPrompt[] = openStores.map((store) => ({
      ...store,
      offers: offersByStore.get(store.id) ?? [],
    }))

    const storeContexts = await buildStoreContexts(storesWithOffers, now)
    const systemPrompt = buildPlanSystemPrompt(storeContexts, now)
    // U006: セッション内の会話履歴（DB永続化なし）を過去ターンとして先頭に並べ、
    // 今回の要望を最後のuserメッセージとして追加する
    const messages = [
      ...(parsed.data.history ?? []).map((h) => ({ role: h.role, content: h.content })),
      { role: 'user' as const, content: buildPlanUserTurn(parsed.data) },
    ]
    const { result, usage, model } = await generatePlan(systemPrompt, messages)

    const validated = generatePlanResponseSchema.safeParse(result)
    if (!validated.success) {
      return zodError(res, validated.error, 502)
    }

    // Issue #136（店舗ダッシュボードにプラン提案回数を表示）: 候補に含まれた店舗の
    // 提案回数を記録する。recordPlanSuggestions自体が内部で例外を握るため、
    // 失敗してもここから先のレスポンス返却には影響しない
    await recordPlanSuggestions(collectStoreIdsFromCandidates(validated.data.candidates))

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

    // Issue #117: err.messageを直接HTTPレスポンスに含めない（内部詳細のクライアントへの
    // 漏洩を避ける）。ユーザー向けに安全な文言を持つエラーはそれぞれの分類から取り出し、
    // それ以外は固定の汎用メッセージにフォールバックする
    if (err instanceof PlanResponseParseError) {
      return sendError(res, 502, 'invalid_ai_response', err.message)
    }
    if (err instanceof PlanGenerationError) {
      return sendError(res, 502, 'claude_api_error', err.userMessage)
    }
    return sendError(res, 502, 'claude_api_error', 'プラン生成に失敗しました')
  }
}
