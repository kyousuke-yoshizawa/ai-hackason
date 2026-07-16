// Issue #154: シードデータとプラン生成のスモークチェックスクリプト。
// シード適用後・デモ前の定型確認として使う（要件定義書v2 10章「内部DB検索の機能性」）。
//
// 実行方法:
//   npm run smoke:seed              # Part 1（DB整合チェック）のみ。APIコストゼロ
//   npm run smoke:seed -- --with-api  # Part 1 + Part 2（POST /api/plan/generate の最小実測）
//
// 前提: backend/db.ts と同じ環境変数（VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY）が
// .env に設定されていること。--with-api 使用時は ANTHROPIC_API_KEY も必要
// （api/plan/generate.ts のハンドラを直接呼び出すため、実際にVercel/Expressを
// 起動する必要はない）。
import 'dotenv/config'
import { supabaseAdmin } from '../backend/db.js'
import handler from '../api/plan/generate.js'

interface CheckResult {
  label: string
  ok: boolean
  detail: string
}

const results: CheckResult[] = []

function record(label: string, ok: boolean, detail: string) {
  results.push({ label, ok, detail })
}

const REQUIRED_CATEGORIES = [
  '定食屋・ランチ',
  'カフェ',
  '映画館',
  'パン屋・軽食',
  '雑貨店',
  '本屋・子連れ',
  'スイーツ',
  'ファミレス・子連れ',
]

async function checkStores(): Promise<string[]> {
  const { data: stores, error } = await supabaseAdmin
    .from('stores')
    .select('id, name, category, x, y, open_time, close_time, price_min, price_max')
    .is('deleted_at', null)

  if (error) {
    record('店舗マスタ取得', false, `Supabaseエラー: ${error.message}`)
    return []
  }

  const kotokotoStores = (stores ?? []).filter((s) =>
    ['のんびり亭', 'ことりの休憩処', 'つきみ座', 'まんまるパンや', 'ふわふわ雑貨店', 'ひなた文庫', 'きらきらアイス堂', 'おひるねファミリー食堂'].includes(
      s.name as string
    )
  )

  record(
    'ことこと町8店舗の存在（#101シード適用済みか）',
    kotokotoStores.length === 8,
    `${kotokotoStores.length}/8件（0件の場合は#101のシードSQL未適用の可能性）`
  )

  const allStores = stores ?? []
  const coordOk = allStores.every((s) => Number(s.x) >= 0 && Number(s.x) <= 400 && Number(s.y) >= 0 && Number(s.y) <= 400)
  record('座標が0〜400内', coordOk, coordOk ? '全店舗OK' : '範囲外の店舗あり')

  const timeOk = allStores.every((s) => String(s.open_time) < String(s.close_time))
  record('open_time < close_time', timeOk, timeOk ? '全店舗OK' : '不整合な店舗あり')

  const priceOk = allStores.every(
    (s) => s.price_min === null || s.price_max === null || Number(s.price_min) <= Number(s.price_max)
  )
  record('price_min <= price_max', priceOk, priceOk ? '全店舗OK' : '不整合な店舗あり')

  const categories = new Set(allStores.map((s) => s.category as string))
  const missingCategories = REQUIRED_CATEGORIES.filter((c) => !categories.has(c))
  record(
    'カテゴリ網羅（要件の欲求例をカバー）',
    missingCategories.length === 0,
    missingCategories.length === 0 ? '全カテゴリOK' : `不足: ${missingCategories.join(', ')}`
  )

  return kotokotoStores.map((s) => s.id as string)
}

async function checkCrowdPatterns(storeIds: string[]) {
  if (storeIds.length === 0) {
    record('crowd_patterns（店舗ごとに1行以上）', false, '対象店舗が0件のためスキップ')
    return
  }
  const { data, error } = await supabaseAdmin.from('crowd_patterns').select('store_id').in('store_id', storeIds)
  if (error) {
    record('crowd_patterns取得', false, `Supabaseエラー: ${error.message}`)
    return
  }
  const storeIdsWithPattern = new Set((data ?? []).map((r) => r.store_id as string))
  const missing = storeIds.filter((id) => !storeIdsWithPattern.has(id))
  record(
    'crowd_patterns（店舗ごとに1行以上）',
    missing.length === 0,
    missing.length === 0 ? '全店舗OK' : `${missing.length}件の店舗にcrowd_patternsなし`
  )
}

async function checkReviews(storeIds: string[]) {
  if (storeIds.length === 0) {
    record('reviews（店舗ごとに1件以上）+ review_stats整合', false, '対象店舗が0件のためスキップ')
    return
  }
  const { data: reviews, error: reviewsError } = await supabaseAdmin
    .from('reviews')
    .select('store_id')
    .in('store_id', storeIds)
  if (reviewsError) {
    record('reviews取得', false, `Supabaseエラー: ${reviewsError.message}`)
    return
  }
  const storeIdsWithReview = new Set((reviews ?? []).map((r) => r.store_id as string))
  const missingReviews = storeIds.filter((id) => !storeIdsWithReview.has(id))
  record(
    'reviews（店舗ごとに1件以上、#151シード適用済みか）',
    missingReviews.length === 0,
    missingReviews.length === 0 ? '全店舗OK' : `${missingReviews.length}件の店舗にreviewsなし（#151未適用の可能性）`
  )

  const { data: stats, error: statsError } = await supabaseAdmin
    .from('review_stats')
    .select('store_id, review_count')
    .in('store_id', storeIds)
  if (statsError) {
    record('review_stats取得', false, `Supabaseエラー: ${statsError.message}`)
    return
  }
  const statsByStore = new Map((stats ?? []).map((s) => [s.store_id as string, Number(s.review_count)]))
  const reviewCountByStore = new Map<string, number>()
  for (const r of reviews ?? []) {
    const id = r.store_id as string
    reviewCountByStore.set(id, (reviewCountByStore.get(id) ?? 0) + 1)
  }
  const mismatched = storeIds.filter((id) => (statsByStore.get(id) ?? 0) !== (reviewCountByStore.get(id) ?? 0))
  record(
    'review_stats整合（トリガー自動更新の確認）',
    mismatched.length === 0,
    mismatched.length === 0 ? '全店舗OK' : `${mismatched.length}件の店舗でreview_count不一致（トリガー未発火の可能性）`
  )
}

async function checkArea() {
  // GET /api/area はVercel Functionsのハンドラだが、ローカルではHTTPサーバーを
  // 起動せず直接importして呼び出す（他のPart 1チェックと同様の軽量な検証方針）
  const { default: areaHandler } = await import('../api/area/index.js')
  let statusCode = 0
  let body: unknown
  const fakeRes = {
    setHeader: () => undefined,
    status(code: number) {
      statusCode = code
      return {
        json(payload: unknown) {
          body = payload
          return payload
        },
      }
    },
  }
  await areaHandler({ method: 'GET' } as never, fakeRes as never)
  // 実装（backend/domains/area/landmarks.ts）は4つのランドマーク概念のうち
  // 「ぷかぷか商店街」を西端・東端の2点として保持するため、実際の件数は5件になる
  const landmarks = (body as { landmarks?: unknown[] } | undefined)?.landmarks ?? []
  record(
    'GET /api/area がランドマーク一覧を返す（4概念・ぷかぷか商店街は2点表現のため計5件）',
    statusCode === 200 && landmarks.length === 5,
    `status=${statusCode}, landmarks=${landmarks.length}件`
  )
}

async function runPart1(): Promise<string[]> {
  const storeIds = await checkStores()
  await checkCrowdPatterns(storeIds)
  await checkReviews(storeIds)
  await checkArea()
  return storeIds
}

async function runPart2(knownStoreIds: string[]) {
  const inputs = ['ランチ', '映画', 'カフェ', '子連れ']
  const knownIds = new Set(knownStoreIds)

  for (const message of inputs) {
    let statusCode = 0
    let body: unknown
    const fakeRes = {
      setHeader: () => undefined,
      status(code: number) {
        statusCode = code
        return {
          json(payload: unknown) {
            body = payload
            return payload
          },
        }
      },
    }
    try {
      await handler({ method: 'POST', body: { message }, headers: {} } as never, fakeRes as never)
    } catch (err) {
      record(`プラン生成「${message}」`, false, `例外: ${err instanceof Error ? err.message : String(err)}`)
      continue
    }

    const candidates = (body as { candidates?: Array<{ stops: Array<{ store_id: string }> }> } | undefined)?.candidates ?? []
    const allStoreIdsKnown = candidates.every((c) => c.stops.every((s) => knownIds.has(s.store_id)))
    record(
      `プラン生成「${message}」`,
      statusCode === 200 && candidates.length >= 1 && allStoreIdsKnown,
      `status=${statusCode}, candidates=${candidates.length}件, store_id全て実在=${allStoreIdsKnown}`
    )
  }
}

async function main() {
  const withApi = process.argv.includes('--with-api')

  console.log('=== Part 1: DB整合チェック ===')
  const storeIds = await runPart1()

  if (withApi) {
    console.log('=== Part 2: プラン生成の最小実測（--with-api） ===')
    await runPart2(storeIds)
  }

  console.log('\n=== 結果 ===')
  for (const r of results) {
    console.log(`${r.ok ? '✅' : '❌'} ${r.label}: ${r.detail}`)
  }

  const failed = results.filter((r) => !r.ok)
  if (failed.length > 0) {
    console.log(`\n${failed.length}件のチェックに失敗しました。`)
    process.exit(1)
  }
  console.log('\n全チェックに成功しました。')
}

main().catch((err) => {
  console.error('スモークチェック実行中にエラーが発生しました:', err)
  process.exit(1)
})
