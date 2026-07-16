import Anthropic from '@anthropic-ai/sdk'

// 要件定義書v2 6.1節・12章で確定済みのモデル。ANTHROPIC_MODELで上書き可能にしておく
// （新モデル移行時に再デプロイのみで済むように）
const DEFAULT_MODEL = 'claude-sonnet-5'
const MAX_TOKENS = 4096

let client: Anthropic | undefined

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY が設定されていません')
    }
    client = new Anthropic({ apiKey })
  }
  return client
}

// プラン生成用のClaude API呼び出しをこの1箇所に集約する（要件定義書v2: API呼び出しは1回に統合）。
// U006（セッション内会話履歴）対応で、ターン間で不変のsystemプロンプトと、
// 過去ターン＋今回のユーザー発話からなるmessages配列を呼び出し側から受け取る形に変更
export async function generatePlan(
  system: string,
  messages: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> {
  const anthropic = getClient()
  const response = await anthropic.messages.create({
    model: process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL,
    max_tokens: MAX_TOKENS,
    system,
    messages,
  })

  const textBlock = response.content.find((block) => block.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude APIからテキスト形式のレスポンスが得られませんでした')
  }
  return textBlock.text
}
