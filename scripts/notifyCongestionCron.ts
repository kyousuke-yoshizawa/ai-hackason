import cron from 'node-cron'
import { runCongestionNotificationCycle } from '../backend/domains/notifications/congestionNotificationJob'

// ローカル開発用：Vercel Cron の代わりに node-cron で30分おきに実行する。
// 本番は vercel.json の crons（/api/cron/notify-congestion）を使用する。
const SCHEDULE = '*/30 9-21 * * *'

cron.schedule(SCHEDULE, async () => {
  try {
    const result = await runCongestionNotificationCycle()
    console.log('[cron] 混雑通知サイクル完了', result)
  } catch (error) {
    console.error('[cron] 混雑通知サイクル失敗', error)
  }
})

console.log(`[cron] 混雑通知ジョブを起動しました（スケジュール: ${SCHEDULE}）`)
