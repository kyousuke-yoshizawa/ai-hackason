// ⚠️ ローカル開発専用スクリプト。CRON_SECRET による認証は行わない
// （serverless版 api/cron/aggregate-crowd-analytics.ts にのみ存在）。
// 本番の実行スケジュールは vercel.json の crons を使用する（そちらは UTC 表記）。
import 'dotenv/config'
import cron from 'node-cron'
import { runCrowdAnalyticsAggregationJob } from '../backend/domains/crowdAnalytics/aggregationJob'

// JST 23:00（営業終了後）に毎日実行する
const SCHEDULE = '0 23 * * *'

cron.schedule(
  SCHEDULE,
  async () => {
    try {
      const result = await runCrowdAnalyticsAggregationJob()
      console.log('[cron] 混雑分析集計バッチ完了', result)
    } catch (error) {
      console.error('[cron] 混雑分析集計バッチ失敗', error)
    }
  },
  { timezone: 'Asia/Tokyo' }
)

console.log(`[cron] 混雑分析集計ジョブを起動しました（スケジュール: ${SCHEDULE} JST）`)
