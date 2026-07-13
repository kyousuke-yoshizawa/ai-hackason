import { aggregateCrowdAnalyticsForDate } from '../../backend/domains/crowdAnalytics/aggregate'
import type { CrowdHistoryEntry } from '../../backend/domains/crowdAnalytics/aggregate'

// TC-205-01: バッチジョブが正確に集計するか検証
describe('aggregateCrowdAnalyticsForDate (TC-205-01)', () => {
  it('counts each level and picks the highest-severity report as the peak', () => {
    const entries: CrowdHistoryEntry[] = [
      { storeId: 'store-1', level: 'low', recordedAt: '2026-07-12T01:00:00.000Z' },
      { storeId: 'store-1', level: 'high', recordedAt: '2026-07-12T03:00:00.000Z' },
      { storeId: 'store-1', level: 'medium', recordedAt: '2026-07-12T09:00:00.000Z' },
    ]

    const [result] = aggregateCrowdAnalyticsForDate(entries, '2026-07-12')

    expect(result).toMatchObject({
      storeId: 'store-1',
      datePeriod: '2026-07-12',
      levelDistribution: { low: 1, medium: 1, high: 1 },
      peakHour: 3,
      peakLevel: 'high',
      totalUpdates: 3,
    })
  })

  it('aggregates independently per store', () => {
    const entries: CrowdHistoryEntry[] = [
      { storeId: 'store-1', level: 'low', recordedAt: '2026-07-12T01:00:00.000Z' },
      { storeId: 'store-2', level: 'high', recordedAt: '2026-07-12T10:00:00.000Z' },
    ]

    const results = aggregateCrowdAnalyticsForDate(entries, '2026-07-12')

    expect(results).toHaveLength(2)
    expect(results.find((r) => r.storeId === 'store-1')).toMatchObject({ peakLevel: 'low', totalUpdates: 1 })
    expect(results.find((r) => r.storeId === 'store-2')).toMatchObject({ peakLevel: 'high', totalUpdates: 1 })
  })

  it('ignores entries outside the target date', () => {
    const entries: CrowdHistoryEntry[] = [
      { storeId: 'store-1', level: 'high', recordedAt: '2026-07-11T23:59:00.000Z' },
      { storeId: 'store-1', level: 'high', recordedAt: '2026-07-13T00:00:00.000Z' },
    ]

    const results = aggregateCrowdAnalyticsForDate(entries, '2026-07-12')

    expect(results).toHaveLength(0)
  })

  it('returns an empty array when there is no data for the date', () => {
    expect(aggregateCrowdAnalyticsForDate([], '2026-07-12')).toEqual([])
  })
})
