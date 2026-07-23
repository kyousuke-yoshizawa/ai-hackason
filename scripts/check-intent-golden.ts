// Issue #145: 意図解析ゴールデンテスト実行スクリプト。
//
// 実行前提:
// - ローカルサーバ（`npm run server` or `npm run dev` 相当）が起動していること
// - サーバ側で ANTHROPIC_API_KEY が設定されていること（PLAN_MOCK=1 だとモック応答のみが
//   返るため、このスクリプトの検証は意味を持たない。実APIを叩く点に注意 = 実行のたびに
//   Claude APIの利用コストが発生する）
//
// 実行方法:
//   npm run golden:intent -- --url http://localhost:3000
//
import { INTENT_CASES, type IntentCase, type IntentCaseExpectation } from '../tests/golden/intentCases.js'

interface GeneratePlanIntent {
  desires: string[]
  party_size?: number | null
  budget?: number | null
  time_limit?: string | null
}

function checkField(
  actual: number | string | null | undefined,
  expected: number | string | null | 'any'
): boolean {
  if (expected === 'any') return true
  return (actual ?? null) === expected
}

function checkDesires(actualDesires: string[], expectedKeywords: string[]): string[] {
  const missing: string[] = []
  for (const keyword of expectedKeywords) {
    const found = actualDesires.some((d) => d.includes(keyword))
    if (!found) missing.push(keyword)
  }
  return missing
}

function judge(intent: GeneratePlanIntent, expect: IntentCaseExpectation): { pass: boolean; reasons: string[] } {
  const reasons: string[] = []

  const missingDesires = checkDesires(intent.desires, expect.desiresInclude)
  if (missingDesires.length > 0) {
    reasons.push(`desiresに不足: ${missingDesires.join('、')}（実際: ${intent.desires.join('、')}）`)
  }
  if (!checkField(intent.party_size, expect.party_size)) {
    reasons.push(`party_size不一致: 期待=${expect.party_size} 実際=${intent.party_size}`)
  }
  if (!checkField(intent.budget, expect.budget)) {
    reasons.push(`budget不一致: 期待=${expect.budget} 実際=${intent.budget}`)
  }
  if (!checkField(intent.time_limit, expect.time_limit)) {
    reasons.push(`time_limit不一致: 期待=${expect.time_limit} 実際=${intent.time_limit}`)
  }

  return { pass: reasons.length === 0, reasons }
}

async function runCase(baseUrl: string, testCase: IntentCase) {
  const res = await fetch(`${baseUrl}/api/plan/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': 'golden-test' },
    body: JSON.stringify({ message: testCase.message }),
  })

  if (!res.ok) {
    return { name: testCase.name, pass: false, reasons: [`HTTP ${res.status}: ${await res.text()}`] }
  }

  const body = (await res.json()) as { intent: GeneratePlanIntent }
  const { pass, reasons } = judge(body.intent, testCase.expect)
  return { name: testCase.name, pass, reasons }
}

async function main() {
  const urlArgIndex = process.argv.indexOf('--url')
  const baseUrl = urlArgIndex >= 0 ? process.argv[urlArgIndex + 1] : 'http://localhost:3000'

  console.log(`意図解析ゴールデンテストを実行します（対象: ${baseUrl}、${INTENT_CASES.length}件）\n`)

  const results = []
  for (const testCase of INTENT_CASES) {
    const result = await runCase(baseUrl, testCase)
    results.push(result)
    console.log(`${result.pass ? '✅' : '❌'} ${result.name}`)
    for (const reason of result.reasons) {
      console.log(`    - ${reason}`)
    }
  }

  const passCount = results.filter((r) => r.pass).length
  console.log(`\n結果: ${passCount}/${results.length} 件 ✅`)

  if (passCount < results.length) {
    process.exitCode = 1
  }
}

main().catch((err) => {
  console.error('ゴールデンテスト実行中にエラーが発生しました:', err)
  process.exitCode = 1
})
