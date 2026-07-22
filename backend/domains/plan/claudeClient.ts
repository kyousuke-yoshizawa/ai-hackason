import Anthropic, { APIConnectionTimeoutError, APIError, RateLimitError } from '@anthropic-ai/sdk'
import { PLAN_RESULT_JSON_SCHEMA } from './schema.js'

// 要件定義書v2 6.1節・12章で確定済みのモデル。ANTHROPIC_MODELで上書き可能にしておく
// （新モデル移行時に再デプロイのみで済むように）
const DEFAULT_MODEL = 'claude-sonnet-5'
const MAX_TOKENS = 4096

// プラン生成ツールの名前。tool_choiceで強制するため、Claudeへの提出手段を1つに固定する
const SUBMIT_PLAN_TOOL_NAME = 'submit_plan'

let client: Anthropic | undefined

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY が設定されていません')
    }
    // Issue #117: Vercel Functionsは無認証エンドポイントかつ実行時間に上限があるため、
    // SDK標準のリトライ（maxRetries）とタイムアウト（timeout、TypeScript SDKではミリ秒指定）
    // を明示設定し、単発の一時的な失敗でユーザー向けエラーに直結しないようにする
    client = new Anthropic({ apiKey, maxRetries: 2, timeout: 30_000 })
  }
  return client
}

export interface GeneratePlanUsage {
  inputTokens: number
  outputTokens: number
}

export interface GeneratePlanResult {
  // Issue #118（Tool use）以降、Claudeの応答から抽出済みの「パース後」の値を保持する
  // （tool_useの場合は object、テキストのフォールバック時はJSON.parse済みの値）。
  // 呼び出し側（api/plan/generate.ts）はもうJSON.parseする必要が無い
  result: unknown
  usage: GeneratePlanUsage
  model: string
}

// Issue #117: Claude API呼び出しの失敗をユーザー向けの日本語メッセージに分類するための
// エラークラス。userMessageはそのままクライアントへのレスポンスに使ってよい安全な文言、
// causeは調査用に元エラーを保持する（クライアントには返さない）
export class PlanGenerationError extends Error {
  constructor(
    public userMessage: string,
    public cause?: unknown
  ) {
    super(userMessage)
    this.name = 'PlanGenerationError'
  }
}

// Issue #118: Claudeの応答（tool_use不在時のテキストフォールバック）がJSONとして
// 解釈できなかった場合の専用エラー。呼び出し側で502 invalid_ai_responseに変換する
export class PlanResponseParseError extends Error {
  constructor(message = 'Claude APIの応答をJSONとして解釈できませんでした') {
    super(message)
    this.name = 'PlanResponseParseError'
  }
}

// テキスト応答のフォールバック時、Claudeがコードブロック記法（```json ... ``` や ``` ... ```）
// で囲んでくることがあるため、先頭・末尾のフェンスを剥がしてからJSON.parseする
function stripCodeFence(text: string): string {
  return text.replace(/^```(?:json)?\s*|\s*```\s*$/g, '')
}

function extractResult(response: Anthropic.Message): unknown {
  const toolBlock = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use' && block.name === SUBMIT_PLAN_TOOL_NAME
  )
  if (toolBlock) {
    // tool_useの入力は既にAnthropic SDKがパース済みのJSオブジェクトであり、JSON.parseは不要
    return toolBlock.input
  }

  const textBlock = response.content.find((block) => block.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new PlanResponseParseError()
  }

  try {
    return JSON.parse(stripCodeFence(textBlock.text))
  } catch {
    throw new PlanResponseParseError()
  }
}

// Issue #117: SDKの生エラーをそのまま外に漏らさず、HTTPレスポンスに使ってよい
// 日本語メッセージへ分類する。RateLimitError（429）→ APIConnectionTimeoutError
// （タイムアウト）→ その他のAPIError → それ以外（ネットワークエラー等）の順で判定する
// （APIConnectionTimeoutErrorはAPIConnectionErrorのサブクラスであり、TypeScript SDKでは
// APIConnectionErrorがAPIErrorのサブクラスであるため、必ずRateLimitError/
// APIConnectionTimeoutErrorをAPIErrorより先に判定する）
function classifyError(err: unknown): PlanGenerationError {
  if (err instanceof RateLimitError) {
    return new PlanGenerationError('プラン生成が混み合っています。少し待ってもう一度お試しください', err)
  }
  if (err instanceof APIConnectionTimeoutError) {
    return new PlanGenerationError('時間がかかりすぎたため中断しました。もう一度お試しください', err)
  }
  if (err instanceof APIError) {
    return new PlanGenerationError('プラン生成に失敗しました', err)
  }
  return new PlanGenerationError('プラン生成に失敗しました', err)
}

// プラン生成用のClaude API呼び出しをこの1箇所に集約する（要件定義書v2: API呼び出しは1回に統合）。
// U006（セッション内会話履歴）対応で、ターン間で不変のsystemプロンプトと、
// 過去ターン＋今回のユーザー発話からなるmessages配列を呼び出し側から受け取る形に変更
export async function generatePlan(
  system: string,
  messages: { role: 'user' | 'assistant'; content: string }[]
): Promise<GeneratePlanResult> {
  const anthropic = getClient()
  const model = process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL

  let response: Anthropic.Message
  try {
    response = await anthropic.messages.create({
      model,
      max_tokens: MAX_TOKENS,
      system,
      messages,
      // Issue #118: 自由記述のJSONではなくtool useで構造化出力を強制し、
      // フォーマット崩れ（説明文混入・コードフェンス等）による解析失敗を減らす
      tools: [
        {
          name: SUBMIT_PLAN_TOOL_NAME,
          description: 'お出かけプランの生成結果を提出する',
          input_schema: PLAN_RESULT_JSON_SCHEMA,
        },
      ],
      tool_choice: { type: 'tool', name: SUBMIT_PLAN_TOOL_NAME },
    })
  } catch (err) {
    throw classifyError(err)
  }

  const result = extractResult(response)

  return {
    result,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
    model,
  }
}
