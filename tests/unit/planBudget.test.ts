import { calculateBudgetSummary, getBudgetStatus } from '../../src/lib/planBudget'
import type { PlanStop } from '../../src/types/plan'

function makeStop(overrides: Partial<PlanStop> = {}): PlanStop {
  return {
    store_id: 'store-1',
    store_name: 'テスト店',
    start_time: '11:00',
    end_time: '12:00',
    travel_note: '',
    reason: '',
    ...overrides,
  }
}

// Issue #123: プラン合計予算の概算表示と予算超過警告のロジック
describe('calculateBudgetSummary', () => {
  it('複数の立ち寄り先のprice_min/price_maxを合算する', () => {
    const stops = [
      makeStop({ price_min: 1000, price_max: 1500 }),
      makeStop({ price_min: 500, price_max: 800 }),
    ]

    const summary = calculateBudgetSummary(stops)

    expect(summary).toEqual({ min: 1500, max: 2300, hasUnknownPrice: false })
  })

  it('価格情報がある店舗とない店舗が混在する場合、不明な店舗は合算から除外しhasUnknownPriceをtrueにする', () => {
    const stops = [
      makeStop({ price_min: 1000, price_max: 1500 }),
      makeStop({ price_min: null, price_max: null }),
      makeStop({ price_min: 500, price_max: 800 }),
    ]

    const summary = calculateBudgetSummary(stops)

    expect(summary).toEqual({ min: 1500, max: 2300, hasUnknownPrice: true })
  })

  it('price_minのみnullの店舗も除外対象になる', () => {
    const stops = [makeStop({ price_min: null, price_max: 1500 })]

    const summary = calculateBudgetSummary(stops)

    expect(summary).toEqual({ min: 0, max: 0, hasUnknownPrice: true })
  })

  it('stopsが空配列なら合計0でhasUnknownPriceはfalse', () => {
    expect(calculateBudgetSummary([])).toEqual({ min: 0, max: 0, hasUnknownPrice: false })
  })
})

describe('getBudgetStatus', () => {
  it('budgetがnull/undefinedなら常にunknown', () => {
    expect(getBudgetStatus({ min: 1000, max: 2000, hasUnknownPrice: false }, null)).toBe('unknown')
    expect(getBudgetStatus({ min: 1000, max: 2000, hasUnknownPrice: false }, undefined)).toBe('unknown')
  })

  it('合計最小がbudgetを超えていればover', () => {
    expect(getBudgetStatus({ min: 3001, max: 4000, hasUnknownPrice: false }, 3000)).toBe('over')
  })

  it('合計最小がbudgetとちょうど等しい場合はoverにならない（境界値）', () => {
    expect(getBudgetStatus({ min: 3000, max: 4000, hasUnknownPrice: false }, 3000)).toBe('unknown')
  })

  it('合計最大がbudget以下ならunder', () => {
    expect(getBudgetStatus({ min: 1000, max: 2000, hasUnknownPrice: false }, 2000)).toBe('under')
  })

  it('合計最大がbudgetとちょうど等しい場合はunderになる（境界値）', () => {
    expect(getBudgetStatus({ min: 1000, max: 3000, hasUnknownPrice: false }, 3000)).toBe('under')
  })

  it('範囲がbudgetをまたぐ場合はunknown', () => {
    expect(getBudgetStatus({ min: 2000, max: 4000, hasUnknownPrice: false }, 3000)).toBe('unknown')
  })
})
