import { getJstHourAndDay, getJstMidnightUtc } from '../../backend/time'

// 実行環境（Vercel FunctionsはデフォルトでプロセスのローカルタイムゾーンがUTC）に依存せず、
// 常にJSTの時間帯・曜日を返すことを検証する。Intl.DateTimeFormatにtimeZoneを明示しているため、
// このテストの結果はprocess.env.TZに左右されない。
describe('getJstHourAndDay', () => {
  it('resolves the JST hour/day for a UTC instant safely inside the same JST calendar day', () => {
    // 2026-07-22T03:00:00Z = 2026-07-22 12:00 JST（水曜）
    expect(getJstHourAndDay(new Date('2026-07-22T03:00:00Z'))).toEqual({ hour: 12, day: 3 })
  })

  it('rolls over to the next JST day when the UTC instant crosses the JST midnight boundary', () => {
    // 2026-07-22T20:00:00Z = 2026-07-23 05:00 JST（木曜）。
    // process のローカルタイムゾーンがUTCの環境では Date.getDay()/getHours() は
    // 「2026-07-22（水曜）05:00」相当を返してしまい、実際のJST曜日と1日ずれる。
    expect(getJstHourAndDay(new Date('2026-07-22T20:00:00Z'))).toEqual({ hour: 5, day: 4 })
  })

  it('resolves JST midnight (00:00) correctly at the exact UTC boundary (15:00 UTC)', () => {
    // 2026-07-22T15:00:00Z = 2026-07-23 00:00 JST（木曜）
    expect(getJstHourAndDay(new Date('2026-07-22T15:00:00Z'))).toEqual({ hour: 0, day: 4 })
  })

  it('resolves the last hour before the JST midnight boundary (14:59 UTC)', () => {
    // 2026-07-22T14:59:00Z = 2026-07-22 23:59 JST（水曜）
    expect(getJstHourAndDay(new Date('2026-07-22T14:59:00Z'))).toEqual({ hour: 23, day: 3 })
  })
})

// Issue #136: 「当日0時JST」の算出。実行環境のローカルタイムゾーンがUTCのため、
// UTC深夜0時〜9時（JSTでは同日の9時〜18時）の間に単純にnew Date().setHours(0,0,0,0)相当の
// ロジックを使うと、JSTの日付境界と1日ずれる（getJstHourAndDayと同種の問題）。
describe('getJstMidnightUtc', () => {
  it('returns 15:00 UTC of the previous day for a UTC instant safely inside the same JST calendar day', () => {
    // 2026-07-22T03:00:00Z = 2026-07-22 12:00 JST（水曜） → JST 2026-07-22 00:00 = UTC 2026-07-21T15:00:00Z
    expect(getJstMidnightUtc(new Date('2026-07-22T03:00:00Z')).toISOString()).toBe('2026-07-21T15:00:00.000Z')
  })

  it('does not roll back a day for a UTC instant just before the JST midnight boundary (14:59 UTC)', () => {
    // 2026-07-22T14:59:00Z = 2026-07-22 23:59 JST（水曜）→ JST当日0時はまだ2026-07-22
    expect(getJstMidnightUtc(new Date('2026-07-22T14:59:00Z')).toISOString()).toBe('2026-07-21T15:00:00.000Z')
  })

  it('rolls over to the next JST day exactly at the UTC boundary (15:00 UTC)', () => {
    // 2026-07-22T15:00:00Z = 2026-07-23 00:00 JST（木曜）→ JST当日0時は2026-07-23
    expect(getJstMidnightUtc(new Date('2026-07-22T15:00:00Z')).toISOString()).toBe('2026-07-22T15:00:00.000Z')
  })

  it('resolves the JST calendar day correctly during the UTC midnight-to-9am window (UTC 00:00-08:59)', () => {
    // 2026-07-22T00:30:00Z = 2026-07-22 09:30 JST（水曜）→ JST当日0時は2026-07-22
    expect(getJstMidnightUtc(new Date('2026-07-22T00:30:00Z')).toISOString()).toBe('2026-07-21T15:00:00.000Z')
  })
})
