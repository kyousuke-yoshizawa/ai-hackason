import { supabaseAdmin } from '../../db.js'
import { unwrap } from '../../unwrap.js'
import type { CongestionLevel } from './types.js'

export async function upsertCrowdStatus(
  storeId: string,
  level: CongestionLevel,
  updatedBy: string,
): Promise<void> {
  unwrap(
    await supabaseAdmin
      .from('crowd_status')
      .upsert({ store_id: storeId, level, updated_by: updatedBy, updated_at: new Date().toISOString() }),
    'upsertCrowdStatus',
  )
}

export async function insertCrowdHistory(
  storeId: string,
  level: CongestionLevel,
  recordedBy: string,
): Promise<void> {
  unwrap(
    await supabaseAdmin.from('crowd_history').insert({ store_id: storeId, level, recorded_by: recordedBy }),
    'insertCrowdHistory',
  )
}

export interface CrowdStatusRow {
  level: CongestionLevel
  updatedAt: string
}

export async function getCurrentCrowdStatus(storeId: string): Promise<CrowdStatusRow | null> {
  const { data, error } = await supabaseAdmin
    .from('crowd_status')
    .select('level, updated_at')
    .eq('store_id', storeId)
    .single()

  if (error || !data) {
    return null
  }

  return { level: data.level, updatedAt: data.updated_at }
}

// 曜日一致の行を優先し、無ければ day_of_week IS NULL（全曜日共通の事前設定）にフォールバックする。
// dayOfWeek は JS の Date.getDay() と同じ規約（0=日曜〜6=土曜）。
export async function getCrowdPattern(
  storeId: string,
  hourOfDay: number,
  dayOfWeek: number,
): Promise<CongestionLevel | null> {
  const { data: dayMatch, error: dayMatchError } = await supabaseAdmin
    .from('crowd_patterns')
    .select('level')
    .eq('store_id', storeId)
    .eq('hour_of_day', hourOfDay)
    .eq('day_of_week', dayOfWeek)
    .single()

  if (!dayMatchError && dayMatch) {
    return dayMatch.level
  }

  const { data: fallback, error: fallbackError } = await supabaseAdmin
    .from('crowd_patterns')
    .select('level')
    .eq('store_id', storeId)
    .eq('hour_of_day', hourOfDay)
    .is('day_of_week', null)
    .single()

  if (fallbackError || !fallback) {
    return null
  }

  return fallback.level
}

export interface CrowdPatternRow {
  dayOfWeek: number | null
  hourOfDay: number
  level: CongestionLevel
}

// 店舗の曜日×時間帯パターン設定を全件取得する（存在する行のみ。7×24の欠損は補完しない）。
export async function listCrowdPatterns(storeId: string): Promise<CrowdPatternRow[]> {
  const rows = unwrap(
    await supabaseAdmin
      .from('crowd_patterns')
      .select('day_of_week, hour_of_day, level')
      .eq('store_id', storeId),
    'listCrowdPatterns',
  )

  return (rows as { day_of_week: number | null; hour_of_day: number; level: CongestionLevel }[]).map((row) => ({
    dayOfWeek: row.day_of_week,
    hourOfDay: row.hour_of_day,
    level: row.level,
  }))
}

// 店舗のパターン設定を渡された内容で全件置き換える（既存行を削除してから一括挿入する）。
// 挿入は単一の bulk insert で行う（1行ずつのループにすると、途中の重複キー等で失敗した場合に
// 削除済み＋一部だけ挿入済みという中途半端な状態が残ってしまうため、all-or-nothing にする）。
export async function replaceCrowdPatterns(storeId: string, patterns: CrowdPatternRow[]): Promise<void> {
  unwrap(
    await supabaseAdmin.from('crowd_patterns').delete().eq('store_id', storeId),
    'replaceCrowdPatterns:delete',
  )

  if (patterns.length === 0) {
    return
  }

  unwrap(
    await supabaseAdmin.from('crowd_patterns').insert(
      patterns.map((pattern) => ({
        store_id: storeId,
        day_of_week: pattern.dayOfWeek,
        hour_of_day: pattern.hourOfDay,
        level: pattern.level,
      })),
    ),
    'replaceCrowdPatterns:insert',
  )
}

export async function isStoreManager(storeId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('store_managers')
    .select('id')
    .eq('store_id', storeId)
    .eq('manager_id', userId)
    .single()

  return !error && !!data
}
