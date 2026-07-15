import { supabaseAdmin } from '../../db.js'
import type { CongestionLevel } from './types.js'

export async function upsertCrowdStatus(
  storeId: string,
  level: CongestionLevel,
  updatedBy: string,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('crowd_status')
    .upsert({ store_id: storeId, level, updated_by: updatedBy, updated_at: new Date().toISOString() })

  if (error) {
    throw new Error(`Failed to upsert crowd status: ${error.message}`)
  }
}

export async function insertCrowdHistory(
  storeId: string,
  level: CongestionLevel,
  recordedBy: string,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('crowd_history')
    .insert({ store_id: storeId, level, recorded_by: recordedBy })

  if (error) {
    throw new Error(`Failed to insert crowd history: ${error.message}`)
  }
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

export async function getCrowdPattern(
  storeId: string,
  hourOfDay: number,
): Promise<CongestionLevel | null> {
  const { data, error } = await supabaseAdmin
    .from('crowd_patterns')
    .select('level')
    .eq('store_id', storeId)
    .eq('hour_of_day', hourOfDay)
    .single()

  if (error || !data) {
    return null
  }

  return data.level
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
