// ⚠️ ローカル開発専用スクリプト。CRON_SECRET による認証は行わない
// （serverless版 api/cron/notify-congestion.ts にのみ存在）。
// 本番の実行スケジュールは vercel.json の crons を使用する（そちらは UTC 表記）。
import 'dotenv/config'
import cron from 'node-cron'
import { runCongestionNotificationCycle } from '../backend/domains/notifications/congestionNotificationJob'

// JST 9:00-21:30（日本の店舗営業時間）に30分おきに実行する
const SCHEDULE = '*/30 9-21 * * *'

cron.schedule(
  SCHEDULE,
  async () => {
    try {
      const result = await runCongestionNotificationCycle()
      console.log('[cron] 混雑通知サイクル完了', result)
    } catch (error) {
      console.error('[cron] 混雑通知サイクル失敗', error)
    }
  },
  { timezone: 'Asia/Tokyo' }
)

console.log(`[cron] 混雑通知ジョブを起動しました（スケジュール: ${SCHEDULE} JST）`)
