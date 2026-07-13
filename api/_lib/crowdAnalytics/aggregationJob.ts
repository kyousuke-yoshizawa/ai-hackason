import { aggregateCrowdAnalyticsForDate } from './aggregate.js'
import { getAllCrowdHistory, upsertCrowdAnalytics } from './repository.js'

export interface CrowdAnalyticsJobResult {
  datePeriod: string
  storeCount: number
}

function utcYesterdayDateKey(now: Date): string {
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  return yesterday.toISOString().slice(0, 10)
}

/** 前日分の crowd_history を店舗ごとに集計し、crowd_analytics へ upsert する。 */
export async function runCrowdAnalyticsAggregationJob(now: Date = new Date()): Promise<CrowdAnalyticsJobResult> {
  const datePeriod = utcYesterdayDateKey(now)
  const history = await getAllCrowdHistory()
  const results = aggregateCrowdAnalyticsForDate(history, datePeriod)

  for (const result of results) {
    await upsertCrowdAnalytics(result)
  }

  return { datePeriod, storeCount: results.length }
}
