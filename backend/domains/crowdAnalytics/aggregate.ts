import type { CongestionLevel } from '../crowd/types.js'

export interface CrowdHistoryEntry {
  storeId: string
  level: CongestionLevel
  recordedAt: string // ISO 8601 (UTC)
}

export interface CrowdAnalyticsResult {
  storeId: string
  datePeriod: string // YYYY-MM-DD (UTC)
  levelDistribution: Record<CongestionLevel, number>
  peakHour: number | null // UTC 0-23、その日最も混雑度が高かった報告の時刻
  peakLevel: CongestionLevel | null
  totalUpdates: number
}

const SEVERITY: Record<CongestionLevel, number> = { low: 0, medium: 1, high: 2 }

function utcDateKey(iso: string): string {
  return iso.slice(0, 10)
}

/**
 * 指定日（datePeriod, UTC）の crowd_history エントリを店舗ごとに集計する純粋関数。
 * peakHour/peakLevel はその日のうちで最も severity が高かった報告の時刻・レベル。
 */
export function aggregateCrowdAnalyticsForDate(
  entries: CrowdHistoryEntry[],
  datePeriod: string,
): CrowdAnalyticsResult[] {
  const dayEntries = entries.filter((entry) => utcDateKey(entry.recordedAt) === datePeriod)

  const byStore = new Map<string, CrowdHistoryEntry[]>()
  for (const entry of dayEntries) {
    const list = byStore.get(entry.storeId)
    if (list) {
      list.push(entry)
    } else {
      byStore.set(entry.storeId, [entry])
    }
  }

  const results: CrowdAnalyticsResult[] = []

  for (const [storeId, storeEntries] of byStore) {
    const levelDistribution: Record<CongestionLevel, number> = { low: 0, medium: 0, high: 0 }
    let peak: CrowdHistoryEntry | null = null

    for (const entry of storeEntries) {
      levelDistribution[entry.level] += 1
      if (!peak || SEVERITY[entry.level] > SEVERITY[peak.level]) {
        peak = entry
      }
    }

    results.push({
      storeId,
      datePeriod,
      levelDistribution,
      peakHour: peak ? new Date(peak.recordedAt).getUTCHours() : null,
      peakLevel: peak ? peak.level : null,
      totalUpdates: storeEntries.length,
    })
  }

  return results
}
