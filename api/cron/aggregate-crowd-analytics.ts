import type { VercelRequest, VercelResponse } from '@vercel/node'
import { runCrowdAnalyticsAggregationJob } from '../../backend/domains/crowdAnalytics/aggregationJob.js'

// GET /api/cron/aggregate-crowd-analytics
// Vercel Cron（vercel.json の crons）から毎日23:00に呼び出される想定。
// 前日分の crowd_history を店舗ごとに集計し、crowd_analytics に反映する。
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  try {
    const result = await runCrowdAnalyticsAggregationJob()
    return res.status(200).json(result)
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'unknown error' })
  }
}
