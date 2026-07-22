import { isOfferActiveNow, type OfferActiveCheckInput } from '../../backend/domains/offers/activeCheck'

// Issue #98（S004・オファー機能）
// 2026-07-16 は JST で木曜日（tests/unit/planPromptBuilder.test.ts の Issue #116 テストと同じ日付を使用）
const THURSDAY_JST_14_00 = new Date('2026-07-16T05:00:00Z') // JST 14:00 木曜日
const THURSDAY_JST_16_00 = new Date('2026-07-16T07:00:00Z') // JST 16:00 木曜日
const THURSDAY_JST_13_59 = new Date('2026-07-16T04:59:00Z') // JST 13:59 木曜日
const THURSDAY_JST_16_01 = new Date('2026-07-16T07:01:00Z') // JST 16:01 木曜日

// 2026-07-18 は JST で土曜日
const SATURDAY_JST_14_00 = new Date('2026-07-18T05:00:00Z') // JST 14:00 土曜日

function offer(overrides: Partial<OfferActiveCheckInput> = {}): OfferActiveCheckInput {
  return {
    is_active: true,
    start_time: '14:00',
    end_time: '16:00',
    weekdays_only: false,
    ...overrides,
  }
}

describe('isOfferActiveNow', () => {
  it('is active exactly at start_time (inclusive)', () => {
    expect(isOfferActiveNow(offer(), THURSDAY_JST_14_00)).toBe(true)
  })

  it('is active exactly at end_time (inclusive)', () => {
    expect(isOfferActiveNow(offer(), THURSDAY_JST_16_00)).toBe(true)
  })

  it('is not active one minute before start_time', () => {
    expect(isOfferActiveNow(offer(), THURSDAY_JST_13_59)).toBe(false)
  })

  it('is not active one minute after end_time', () => {
    expect(isOfferActiveNow(offer(), THURSDAY_JST_16_01)).toBe(false)
  })

  it('is not active when is_active is false, even within the time window', () => {
    expect(isOfferActiveNow(offer({ is_active: false }), THURSDAY_JST_14_00)).toBe(false)
  })

  it('is active on a weekday when weekdays_only is true', () => {
    expect(isOfferActiveNow(offer({ weekdays_only: true }), THURSDAY_JST_14_00)).toBe(true)
  })

  it('is not active on a Saturday when weekdays_only is true', () => {
    expect(isOfferActiveNow(offer({ weekdays_only: true }), SATURDAY_JST_14_00)).toBe(false)
  })

  it('is active on a Saturday when weekdays_only is false', () => {
    expect(isOfferActiveNow(offer({ weekdays_only: false }), SATURDAY_JST_14_00)).toBe(true)
  })

  it('resolves the JST hour/day across the UTC/JST date boundary (00:00-08:59 JST)', () => {
    // 2026-07-16T23:30:00Z は JST で 2026-07-17 08:30、金曜日（UTC日付のままだと木曜のまま
    // ずれてしまう境界ケース）。JST 08:30 は 14:00〜16:00 の対象外だが、
    // 曜日境界の判定（weekdays_only）がJST基準であることも同時に確認する
    const acrossDateBoundary = new Date('2026-07-16T23:30:00Z')

    expect(isOfferActiveNow(offer({ weekdays_only: true }), acrossDateBoundary)).toBe(false) // 時間帯外
    expect(
      isOfferActiveNow(offer({ start_time: '08:00', end_time: '09:00', weekdays_only: true }), acrossDateBoundary),
    ).toBe(true) // JST金曜08:30は平日かつ時間帯内
  })
})
