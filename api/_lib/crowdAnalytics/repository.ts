import { supabaseAdmin } from '../supabaseAdmin.js'
import type { CongestionLevel } from '../email/templates.js'
import type { CrowdAnalyticsResult, CrowdHistoryEntry } from './aggregate.js'

export async function getAllCrowdHistory(): Promise<CrowdHistoryEntry[]> {
  const { data, error } = await supabaseAdmin.from('crowd_history').select('store_id, level, recorded_at')

  if (error) {
    throw new Error(`Failed to fetch crowd history: ${error.message}`)
  }

  return ((data ?? []) as { store_id: string; level: CongestionLevel; recorded_at: string }[]).map((row) => ({
    storeId: row.store_id,
    level: row.level,
    recordedAt: row.recorded_at,
  }))
}

export async function upsertCrowdAnalytics(result: CrowdAnalyticsResult): Promise<void> {
  const { error } = await supabaseAdmin.from('crowd_analytics').upsert({
    store_id: result.storeId,
    date_period: result.datePeriod,
    level_distribution: result.levelDistribution,
    peak_hour: result.peakHour,
    peak_level: result.peakLevel,
    total_updates: result.totalUpdates,
  })

  if (error) {
    throw new Error(`Failed to upsert crowd analytics: ${error.message}`)
  }
}

export interface CrowdAnalyticsRow {
  datePeriod: string
  levelDistribution: Record<CongestionLevel, number>
  peakHour: number | null
  peakLevel: CongestionLevel | null
  totalUpdates: number
}

export async function getCrowdAnalyticsForStore(storeId: string): Promise<CrowdAnalyticsRow[]> {
  const { data, error } = await supabaseAdmin
    .from('crowd_analytics')
    .select('date_period, level_distribution, peak_hour, peak_level, total_updates')
    .eq('store_id', storeId)

  if (error) {
    throw new Error(`Failed to fetch crowd analytics: ${error.message}`)
  }

  return (
    (data ?? []) as {
      date_period: string
      level_distribution: Record<CongestionLevel, number>
      peak_hour: number | null
      peak_level: CongestionLevel | null
      total_updates: number
    }[]
  ).map((row) => ({
    datePeriod: row.date_period,
    levelDistribution: row.level_distribution,
    peakHour: row.peak_hour,
    peakLevel: row.peak_level,
    totalUpdates: row.total_updates,
  }))
}
