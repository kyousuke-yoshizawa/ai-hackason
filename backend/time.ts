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
