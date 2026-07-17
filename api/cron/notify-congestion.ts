import { runCongestionNotificationCycle } from '../../backend/domains/notifications/congestionNotificationJob.js'
import { createCronHandler } from '../../backend/http/cronHandler.js'

// GET /api/cron/notify-congestion
// Vercel Cron（vercel.json の crons）から30分おきに呼び出される想定。
// 営業時間外に呼ばれないよう、cron式自体は営業時間帯に限定している。
export default createCronHandler(runCongestionNotificationCycle)
