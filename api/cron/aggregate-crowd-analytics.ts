import { runCrowdAnalyticsAggregationJob } from '../../backend/domains/crowdAnalytics/aggregationJob.js'
import { createCronHandler } from '../../backend/http/cronHandler.js'

// GET /api/cron/aggregate-crowd-analytics
// Vercel Cron（vercel.json の crons）から毎日23:00に呼び出される想定。
// 前日分の crowd_history を店舗ごとに集計し、crowd_analytics に反映する。
export default createCronHandler(runCrowdAnalyticsAggregationJob)
