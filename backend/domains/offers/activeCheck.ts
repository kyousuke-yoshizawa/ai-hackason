import { getJstHourAndDay } from '../../time.js'

export interface OfferActiveCheckInput {
  is_active: boolean
  start_time: string // HH:MM
  end_time: string // HH:MM
  weekdays_only: boolean
}

// 平日判定用（backend/time.ts の曜日規約: 0=日曜〜6=土曜と揃える）
const WEEKDAY_DAYS = new Set([1, 2, 3, 4, 5])

function toMinutesOfDay(hhmm: string): number {
  const [hourStr, minuteStr] = hhmm.split(':')
  return Number(hourStr) * 60 + Number(minuteStr)
}

// JST は UTC+9:00（分単位の端数オフセットが無い）ため、「分」の値自体はUTC/JSTで変わらない。
// タイムゾーンによってずれるのは「時」と「日付（曜日）」のみ（JST 00:00〜08:59 が UTC上は
// 前日 15:00〜23:59になるため。CLAUDE.md記載の過去のcron UTC/JSTずれバグと同種の問題）。
// そのため「時」「曜日」は getJstHourAndDay 経由（JST基準）で取得し、「分」は
// now.getUTCMinutes() をそのまま使ってよい。
function currentJstMinutesOfDay(now: Date): number {
  const { hour } = getJstHourAndDay(now)
  return hour * 60 + now.getUTCMinutes()
}

// あるオファーが指定時刻（JST基準）に適用中かを判定する純関数。
// Issue #135（オファーのプラン反映プレビュー）でも再利用される想定のためexportする。
export function isOfferActiveNow(offer: OfferActiveCheckInput, now: Date = new Date()): boolean {
  if (!offer.is_active) return false

  const { day } = getJstHourAndDay(now)
  if (offer.weekdays_only && !WEEKDAY_DAYS.has(day)) return false

  const currentMinutes = currentJstMinutesOfDay(now)
  return currentMinutes >= toMinutesOfDay(offer.start_time) && currentMinutes <= toMinutesOfDay(offer.end_time)
}
