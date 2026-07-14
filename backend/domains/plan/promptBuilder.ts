import { formatCrowdLevelForPrompt, resolveCurrentCrowdLevel } from '../crowd/getCurrentLevel.js'
import { getStoreReviewStats } from '../social/reviewsRepository.js'
import { getDistanceTag, scoreStore, type DistanceTag } from './scoring.js'
import type { GeneratePlanRequest } from './schema.js'

export interface StoreForPrompt {
  id: string
  name: string
  category: string
  x: number
  y: number
  open_time: string | null
  close_time: string | null
  price_min: number | null
  price_max: number | null
}

export interface StoreContext extends StoreForPrompt {
  distanceTag: DistanceTag
  rating: number | null
  crowdText: string
  score: number
}

const DISTANCE_LABEL: Record<DistanceTag, string> = { near: '近い', normal: '普通', far: '遠い' }

// どんぐり広場（ことこと町の中心・要件定義書v2 2.2.1節）を出発点の目安として距離感タグを算出する。
// このMVPでは利用者の現在地入力欄が無いため、町の中心を基準点として代用する
const TOWN_CENTER = { x: 0, y: 0 }

export async function buildStoreContexts(stores: StoreForPrompt[]): Promise<StoreContext[]> {
  return Promise.all(
    stores.map(async (store) => {
      const [crowdResult, stats] = await Promise.all([
        resolveCurrentCrowdLevel(store.id),
        getStoreReviewStats(store.id),
      ])
      const distanceTag = getDistanceTag(store.x - TOWN_CENTER.x, store.y - TOWN_CENTER.y)
      const rating = stats.review_count > 0 ? stats.avg_rating : null
      const score = scoreStore({
        distanceTag,
        rating,
        crowdLevel: crowdResult.level,
        // オファー機能（要件定義書v2 S004）はDBスキーマ未実装のため常にfalse
        hasOffer: false,
      })

      return {
        ...store,
        distanceTag,
        rating,
        crowdText: formatCrowdLevelForPrompt(store.name, crowdResult),
        score,
      }
    })
  )
}

function formatConstraints(request: GeneratePlanRequest): string {
  const parts = [
    request.party_size ? `人数: ${request.party_size}名` : null,
    request.budget ? `予算: ¥${request.budget}以内` : null,
    request.time_limit ? `${request.time_limit}まで` : null,
  ].filter((part): part is string => part !== null)

  return parts.join(' / ')
}

// Claude API呼び出しは1回に統合（要件定義書v2 確定事項）。意図解析・店舗照合・
// スコアリング・プラン生成のすべてをこの1つのプロンプトに含める
export function buildPlanPrompt(request: GeneratePlanRequest, stores: StoreContext[]): string {
  const storeLines = stores
    .map(
      (s) =>
        `- ${s.name}（${s.category}）: 距離感=${DISTANCE_LABEL[s.distanceTag]}、` +
        `営業時間 ${s.open_time ?? '不明'}〜${s.close_time ?? '不明'}、` +
        `価格帯 ¥${s.price_min ?? '?'}〜¥${s.price_max ?? '?'}、` +
        `評価 ${s.rating !== null ? s.rating.toFixed(1) : '未評価'}、` +
        `${s.crowdText}、参考スコア ${s.score.toFixed(2)}（店舗ID: ${s.id}）`
    )
    .join('\n')

  const constraints = formatConstraints(request)

  return `あなたは架空エリア「ことこと町」のお出かけプランを提案するAIアシスタントです。
以下の店舗一覧と、ユーザーの要望をもとに、複数のお出かけプラン案を時系列・移動順序付きで提案してください。

## 店舗一覧
${storeLines}

## ユーザーの要望
${request.message}
${constraints ? `\n## 制約条件\n${constraints}` : ''}

## 指示
- 「距離感」は店舗間の徒歩移動のしやすさの目安です。「近い」の店舗同士を優先的に組み合わせ、それらしい徒歩移動時間（例: 徒歩5分程度）を travel_note に生成してください。厳密な数値計算は不要です。
- 参考スコアは距離感35%・評価25%・混雑度25%・オファー15%の重み付けで算出した目安です。プラン全体のスコア算出やお店選定の参考にしてください。
- 各店舗の営業時間内に収まるようにプランを組んでください。
- 出力は必ず以下のJSON形式のみとし、説明文やコードブロックのマークダウン記法は付けないでください。

{
  "intent": { "desires": string[], "party_size": number | null, "budget": number | null, "time_limit": string | null },
  "candidates": [
    {
      "label": "案A",
      "stops": [
        { "store_id": string, "store_name": string, "start_time": "HH:MM", "end_time": "HH:MM", "travel_note": string, "reason": string }
      ],
      "score": number,
      "summary": string
    }
  ]
}`
}
