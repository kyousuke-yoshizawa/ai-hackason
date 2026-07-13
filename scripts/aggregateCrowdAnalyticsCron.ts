import cron from 'node-cron'
import { runCrowdAnalyticsAggregationJob } from '../api/_lib/crowdAnalytics/aggregationJob'

// ローカル開発用：Vercel Cron の代わりに node-cron で毎日23:00に実行する。
// 本番は vercel.json の crons（/api/cron/aggregate-crowd-analytics）を使用する。
const SCHEDULE = '0 23 * * *'

cron.schedule(SCHEDULE, async () => {
  try {
    const result = await runCrowdAnalyticsAggregationJob()
    console.log('[cron] 混雑分析集計バッチ完了', result)
  } catch (error) {
    console.error('[cron] 混雑分析集計バッチ失敗', error)
  }
})

console.log(`[cron] 混雑分析集計ジョブを起動しました（スケジュール: ${SCHEDULE}）`)
