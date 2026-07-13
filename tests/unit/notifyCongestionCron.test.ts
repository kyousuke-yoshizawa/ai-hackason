jest.mock('node-cron', () => ({ schedule: jest.fn() }))
jest.mock('../../backend/domains/notifications/congestionNotificationJob', () => ({
  runCongestionNotificationCycle: jest.fn().mockResolvedValue({ scheduledCount: 0, processedCount: 0 }),
}))

import cron from 'node-cron'
import { runCongestionNotificationCycle } from '../../backend/domains/notifications/congestionNotificationJob'

// TC-109-01: cron ジョブが 30 分間隔（営業時間帯）で実行されるか検証
describe('local dev cron registration (TC-109-01)', () => {
  it('registers a 30-minute business-hours schedule that invokes the congestion notification cycle', async () => {
    await import('../../scripts/notifyCongestionCron')

    expect(cron.schedule).toHaveBeenCalledWith('*/30 9-21 * * *', expect.any(Function))

    const [, callback] = (cron.schedule as jest.Mock).mock.calls[0]
    await callback()

    expect(runCongestionNotificationCycle).toHaveBeenCalledTimes(1)
  })
})
