import { isOfferActiveNow } from '../../src/lib/offers'

// Issue #135（オファーのプラン反映プレビュー）: フロント版isOfferActiveNowの境界値テスト。
// バックエンド版（tests/unit/offersActiveCheck.test.ts）と違い、こちらはJST変換を行わず
// ブラウザのローカル時刻をそのまま使う簡易版のため、テストも `new Date(year, month, day, h, m)`
// というローカル時刻ベースのDateコンストラクタで組み立てる（実行環境のTZに依存しても
// 「構築」と「読み取り」の両方がローカル時刻基準になるため結果は安定する）。
// 2026-07-16は木曜日、2026-07-18は土曜日（バックエンド版テストと同じ日付を使用）
function localDateTime(hour: number, minute: number, day = 16): Date {
  return new Date(2026, 6, day, hour, minute)
}

interface OfferInput {
  start_time: string
  end_time: string
  weekdays_only: boolean
  is_active: boolean
}

function offer(overrides: Partial<OfferInput> = {}): OfferInput {
  return {
    start_time: '14:00',
    end_time: '16:00',
    weekdays_only: false,
    is_active: true,
    ...overrides,
  }
}

describe('isOfferActiveNow (frontend simplified version)', () => {
  it('is active exactly at start_time (inclusive)', () => {
    expect(isOfferActiveNow(offer(), localDateTime(14, 0))).toBe(true)
  })

  it('is active exactly at end_time (inclusive)', () => {
    expect(isOfferActiveNow(offer(), localDateTime(16, 0))).toBe(true)
  })

  it('is not active one minute before start_time', () => {
    expect(isOfferActiveNow(offer(), localDateTime(13, 59))).toBe(false)
  })

  it('is not active one minute after end_time', () => {
    expect(isOfferActiveNow(offer(), localDateTime(16, 1))).toBe(false)
  })

  it('is not active when is_active is false, even within the time window', () => {
    expect(isOfferActiveNow(offer({ is_active: false }), localDateTime(14, 0))).toBe(false)
  })

  it('is active on a weekday (Thursday) when weekdays_only is true', () => {
    expect(isOfferActiveNow(offer({ weekdays_only: true }), localDateTime(14, 0, 16))).toBe(true)
  })

  it('is not active on a Saturday when weekdays_only is true', () => {
    expect(isOfferActiveNow(offer({ weekdays_only: true }), localDateTime(14, 0, 18))).toBe(false)
  })

  it('is active on a Saturday when weekdays_only is false', () => {
    expect(isOfferActiveNow(offer({ weekdays_only: false }), localDateTime(14, 0, 18))).toBe(true)
  })
})
