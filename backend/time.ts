// Vercel Functions / ローカル開発サーバーは実行環境のローカルタイムゾーンがUTCになるため、
// Date.getHours()/getDay() をそのまま使うと、JST 00:00〜08:59（UTC 15:00〜23:59）の間
// 時間帯・曜日が実際のJSTと1日ずれる（過去のcronスケジュールJST/UTC変換ミスと同種の問題）。
// 混雑パターン・定休日など「JSTの時間帯・曜日」で判定するロジックは、必ずこの関数経由にすること。
const JST_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Tokyo',
  weekday: 'short',
  hour: 'numeric',
  hour12: false,
})

const WEEKDAY_TO_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

export function getJstHourAndDay(date: Date): { hour: number; day: number } {
  const parts = JST_FORMATTER.formatToParts(date)
  const weekday = parts.find((part) => part.type === 'weekday')?.value
  const hourPart = parts.find((part) => part.type === 'hour')?.value

  if (!weekday || !(weekday in WEEKDAY_TO_INDEX) || hourPart === undefined) {
    throw new Error('failed to resolve JST hour/day from date')
  }

  // hour12:false は環境（ICUバージョン）によって深夜0時を "24" として返すことがある
  const hour = Number(hourPart) % 24

  return { hour, day: WEEKDAY_TO_INDEX[weekday] }
}

const JST_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const JST_OFFSET_MS = 9 * 60 * 60 * 1000

/**
 * 「JSTの当日0時」に対応するUTC瞬間（Date）を返す。Issue #136（プラン提案回数の
 * 当日集計）向け。実行環境のローカルタイムゾーンがUTCのため、単純に
 * `new Date().setHours(0,0,0,0)` すると UTC 0時を JST の日付境界と取り違え、
 * UTC 00:00〜08:59（JST 09:00〜17:59）の間は前日扱いになってしまう
 * （getJstHourAndDay の説明と同種のUTC/JSTずれ）。必ずこの関数経由にすること。
 */
export function getJstMidnightUtc(date: Date): Date {
  const parts = JST_DATE_FORMATTER.formatToParts(date)
  const year = Number(parts.find((part) => part.type === 'year')?.value)
  const month = Number(parts.find((part) => part.type === 'month')?.value)
  const day = Number(parts.find((part) => part.type === 'day')?.value)

  if (!year || !month || !day) {
    throw new Error('failed to resolve JST date from date')
  }

  // JSTのY-M-D 00:00は、UTC上ではその日のUTC 00:00より9時間前（前日15:00 UTC）の瞬間
  return new Date(Date.UTC(year, month - 1, day) - JST_OFFSET_MS)
}
