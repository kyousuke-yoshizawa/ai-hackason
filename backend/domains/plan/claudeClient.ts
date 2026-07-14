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

// プラン生成用のClaude API呼び出しをこの1箇所に集約する（要件定義書v2: API呼び出しは1回に統合）
export async function generatePlan(prompt: string): Promise<string> {
  const anthropic = getClient()
  const response = await anthropic.messages.create({
    model: process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL,
    max_tokens: MAX_TOKENS,
    messages: [{ role: 'user', content: prompt }],
  })

  const textBlock = response.content.find((block) => block.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude APIからテキスト形式のレスポンスが得られませんでした')
  }
  return textBlock.text
}
