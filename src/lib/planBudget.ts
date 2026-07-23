import type { PlanStop } from '../types/plan'

export interface BudgetSummary {
  min: number
  max: number
  hasUnknownPrice: boolean
}

// #123: 立ち寄り先ごとのprice_min/price_maxを合算して概算予算を出す。
// 価格不明（null/undefined）の店舗は合計から除外し、「一部店舗の価格不明」の注記に使う。
export function calculateBudgetSummary(stops: PlanStop[]): BudgetSummary {
  let min = 0
  let max = 0
  let hasUnknownPrice = false

  for (const stop of stops) {
    if (stop.price_min == null || stop.price_max == null) {
      hasUnknownPrice = true
      continue
    }
    min += stop.price_min
    max += stop.price_max
  }

  return { min, max, hasUnknownPrice }
}

export type BudgetStatus = 'over' | 'under' | 'unknown'

// #123: budget未設定なら判定なし。合計最小がbudgetを超えていれば予算オーバー警告、
// 合計最大がbudget以下なら予算内。それ以外（範囲がbudgetをまたぐ）はどちらとも言えないため無表示。
export function getBudgetStatus(summary: BudgetSummary, budget: number | null | undefined): BudgetStatus {
  if (budget == null) return 'unknown'
  if (summary.min > budget) return 'over'
  if (summary.max <= budget) return 'under'
  return 'unknown'
}
