import { remainingMinutes } from '../../src/lib/crowdLive'

// Issue #134: ライブ混雑報告（crowd_reported_at）の残効時間計算の境界値テスト
const NOW = new Date('2026-07-22T12:00:00.000Z')

function minutesAgo(minutes: number): string {
  return new Date(NOW.getTime() - minutes * 60_000).toISOString()
}

describe('remainingMinutes', () => {
  it('reportedAt が null の場合は null を返す', () => {
    expect(remainingMinutes(null, NOW)).toBeNull()
  })

  it('経過29分（残り1分）は 1 を返す', () => {
    expect(remainingMinutes(minutesAgo(29), NOW)).toBe(1)
  })

  it('経過ちょうど30分は 0 を返す（失効）', () => {
    expect(remainingMinutes(minutesAgo(30), NOW)).toBe(0)
  })

  it('経過31分は 0 を返す', () => {
    expect(remainingMinutes(minutesAgo(31), NOW)).toBe(0)
  })

  it('経過0分は ttlMinutes（既定30分）を返す', () => {
    expect(remainingMinutes(minutesAgo(0), NOW)).toBe(30)
  })

  it('経過0.5分（30秒）は切り上げでttlMinutesのまま', () => {
    const reportedAt = new Date(NOW.getTime() - 30_000).toISOString()
    expect(remainingMinutes(reportedAt, NOW)).toBe(30)
  })

  it('ttlMinutes を指定した場合はその値を基準に計算する', () => {
    expect(remainingMinutes(minutesAgo(9), NOW, 10)).toBe(1)
    expect(remainingMinutes(minutesAgo(10), NOW, 10)).toBe(0)
  })
})
