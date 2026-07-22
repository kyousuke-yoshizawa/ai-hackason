import type { CongestionLevel } from '../crowd/types.js'

// 要件定義書v2 5章「スコアリング設計（確定）」の重み付けをそのまま反映する
export type DistanceTag = 'near' | 'normal' | 'far'

const DISTANCE_WEIGHT = 0.35
const RATING_WEIGHT = 0.25
const CROWD_WEIGHT = 0.25
const OFFER_BONUS = 0.15

const DISTANCE_SCORE: Record<DistanceTag, number> = { near: 1.0, normal: 0.6, far: 0.2 }
const CROWD_SCORE: Record<CongestionLevel, number> = { low: 1.0, medium: 0.6, high: 0.2 }

// 要件定義書v2 2.1節の閾値: 近い=150m以内／普通=150〜400m／遠い=400m以上
const NEAR_RADIUS_M = 150
const NORMAL_RADIUS_M = 400

export function getDistanceTag(dx: number, dy: number): DistanceTag {
  const distance = Math.sqrt(dx * dx + dy * dy)
  if (distance <= NEAR_RADIUS_M) return 'near'
  if (distance <= NORMAL_RADIUS_M) return 'normal'
  return 'far'
}

export interface ScoreInput {
  distanceTag: DistanceTag
  rating: number | null
  crowdLevel: CongestionLevel | null
  hasOffer: boolean
}

// レビュー無し・混雑情報不明の店舗は中間値（0.5 / medium相当）を割り当てる。
// オファー機能（S004）: hasOfferは呼び出し側（backend/domains/plan/promptBuilder.tsの
// buildStoreContexts）が、backend/domains/offers/activeCheck.tsのisOfferActiveNowで
// 「その店舗に現在時刻適用中のオファーが1件でもあるか」を判定した結果を渡す
export function scoreStore({ distanceTag, rating, crowdLevel, hasOffer }: ScoreInput): number {
  const distanceScore = DISTANCE_SCORE[distanceTag] * DISTANCE_WEIGHT
  const ratingScore = (rating !== null ? rating / 5 : 0.5) * RATING_WEIGHT
  const crowdScore = (crowdLevel !== null ? CROWD_SCORE[crowdLevel] : 0.6) * CROWD_WEIGHT
  const offerScore = hasOffer ? OFFER_BONUS : 0

  return Math.min(1, distanceScore + ratingScore + crowdScore + offerScore)
}
