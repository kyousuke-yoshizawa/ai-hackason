// Issue #148: プラン生成レイテンシ計測スクリプト。
//
// 実行前提:
// - ローカルサーバ（`npm run server` 等）またはVercel Previewが起動していること
// - サーバ側で ANTHROPIC_API_KEY が設定されていること（PLAN_MOCK=1だと固定応答のみが
//   返るため、このスクリプトの計測は意味を持たない）
// - 実APIを叩く点に注意（3ケース×5回=15回呼び出し分のコストが発生する。実行前にTeamsで一声かける）
//
// 実行方法:
//   npm run measure:latency -- --url http://localhost:3000
//   npm run measure:latency -- --url https://<vercel-preview-url>
//
import { setTimeout as sleep } from 'node:timers/promises'

interface LatencyCase {
  name: string
  body: Record<string, unknown>
}

const CASES: LatencyCase[] = [
  { name: '短い単欲求', body: { message: 'ランチしたい' } },
  {
    name: '標準3欲求',
    body: { message: 'ランチして、映画見て、カフェ行きたい。2人、15時まで' },
  },
  {
    name: '制約盛り盛り',
    body: {
      message:
        '子連れで、ランチと買い物とカフェと映画を楽しみたいです。天気がいいので外を歩くのも好きです。' +
        '安めのお店を希望します',
      party_size: 4,
      budget: 8000,
      time_limit: '18:00',
      start_time: '11:00',
    },
  },
]

const REPEAT_COUNT = 5

interface RunResult {
  ms: number
  inputTokens: number | null
  outputTokens: number | null
  ok: boolean
}

async function runOnce(baseUrl: string, testCase: LatencyCase): Promise<RunResult> {
  const startedAt = Date.now()
  const res = await fetch(`${baseUrl}/api/plan/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': 'latency-measure' },
    body: JSON.stringify(testCase.body),
  })
  const ms = Date.now() - startedAt

  if (!res.ok) {
    console.error(`  ⚠️ HTTP ${res.status}: ${await res.text()}`)
    return { ms, inputTokens: null, outputTokens: null, ok: false }
  }

  // usage（トークン数）はレスポンスボディに含まれないため（api/plan/generate.tsは
  // usageをconsole.logするのみでレスポンスには返さない）、ここでは取得できない。
  // トークン数はサーバのVercelログ（evt: 'plan_generated'）側で別途確認する運用とする
  await res.json()
  return { ms, inputTokens: null, outputTokens: null, ok: true }
}

function percentile(sorted: number[], p: number): number {
  const index = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))]
}

function formatMs(ms: number): string {
  return `${(ms / 1000).toFixed(2)}s`
}

async function main() {
  const urlArgIndex = process.argv.indexOf('--url')
  const baseUrl = urlArgIndex >= 0 ? process.argv[urlArgIndex + 1] : 'http://localhost:3000'

  console.log(`プラン生成レイテンシ計測を実行します（対象: ${baseUrl}）`)
  console.log(`各ケース${REPEAT_COUNT}回、計${CASES.length * REPEAT_COUNT}回呼び出します\n`)

  const rows: { name: string; min: number; p50: number; max: number; failCount: number }[] = []

  for (const testCase of CASES) {
    console.log(`--- ${testCase.name} ---`)
    const timings: number[] = []
    let failCount = 0

    for (let i = 0; i < REPEAT_COUNT; i++) {
      const result = await runOnce(baseUrl, testCase)
      console.log(`  ${i + 1}/${REPEAT_COUNT}: ${formatMs(result.ms)}${result.ok ? '' : '（失敗）'}`)
      timings.push(result.ms)
      if (!result.ok) failCount++
      await sleep(500) // レート制限（PLAN_RATE_LIMIT）回避のための間隔
    }

    const sorted = [...timings].sort((a, b) => a - b)
    rows.push({
      name: testCase.name,
      min: sorted[0],
      p50: percentile(sorted, 50),
      max: sorted[sorted.length - 1],
      failCount,
    })
    console.log()
  }

  console.log('## 計測結果\n')
  console.log('| ケース | min | p50 | max | 失敗数 |')
  console.log('|---|---|---|---|---|')
  for (const row of rows) {
    console.log(
      `| ${row.name} | ${formatMs(row.min)} | ${formatMs(row.p50)} | ${formatMs(row.max)} | ${row.failCount}/${REPEAT_COUNT} |`
    )
  }
  console.log(
    '\n※ トークン数はこのスクリプトのレスポンスには含まれないため取得不可。' +
      'Vercelログ（evt: "plan_generated"）側で別途確認すること。'
  )
}

main().catch((err) => {
  console.error('レイテンシ計測中にエラーが発生しました:', err)
  process.exitCode = 1
})
