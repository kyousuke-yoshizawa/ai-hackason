import { supabaseAdmin } from '../supabaseAdmin'
import type { CongestionLevel } from '../email/templates'

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
