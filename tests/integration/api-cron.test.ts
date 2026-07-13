process.env.LINK_TOKEN_SECRET = 'test-secret'

jest.mock('../../backend/db', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createFakeSupabaseClient } = require('../testUtils/fakeSupabase')
  return { supabaseAdmin: createFakeSupabaseClient() }
})

jest.mock('../../backend/domains/email/mailer', () => ({
  sendEmail: jest.fn(),
}))

import { supabaseAdmin } from '../../backend/db'
import { sendEmail } from '../../backend/domains/email/mailer'
import type { FakeSupabaseClient } from '../testUtils/fakeSupabase'
import { runCongestionNotificationCycle } from '../../backend/domains/notifications/congestionNotificationJob'

const fakeClient = supabaseAdmin as unknown as FakeSupabaseClient

beforeEach(() => {
  fakeClient.reset()
  ;(sendEmail as jest.Mock).mockReset()
  fakeClient.seed('store_managers', [{ store_id: 'store-1', manager_id: 'manager-1' }])
  fakeClient.seed('stores', [{ id: 'store-1', name: '渋谷店' }])
  fakeClient.seed('users', [{ id: 'manager-1', email: 'manager@store.example' }])
  fakeClient.seed('crowd_status', [{ store_id: 'store-1', level: 'medium' }])
})

// TC-109-02: メール送信フロー（キュー → SendGrid → ログ）
describe('runCongestionNotificationCycle (TC-109-02)', () => {
  it('schedules a notification per store manager, sends it, and logs the result', async () => {
    (sendEmail as jest.Mock).mockResolvedValueOnce({ success: true, providerMessageId: 'sg-1' })

    const result = await runCongestionNotificationCycle()

    expect(result.scheduledCount).toBe(1)
    expect(result.processedCount).toBe(1)

    const notifications = fakeClient.getRows('email_notifications')
    expect(notifications).toHaveLength(1)
    expect(notifications[0].is_sent).toBe(true)
    expect(notifications[0].link_token).toBeTruthy()
    expect(notifications[0].link_token_expires_at).toBeTruthy()

    const logs = fakeClient.getRows('email_send_logs')
    expect(logs).toHaveLength(1)
    expect(logs[0].status).toBe('sent')

    const sentHtml = (sendEmail as jest.Mock).mock.calls[0][0].html as string
    expect(sentHtml).toContain('level=high')
    expect(sentHtml).toContain('level=medium')
    expect(sentHtml).toContain('level=low')
  })

  it('does not send anything when there are no store managers', async () => {
    fakeClient.reset()

    const result = await runCongestionNotificationCycle()

    expect(result).toEqual({ scheduledCount: 0, processedCount: 0 })
    expect(sendEmail).not.toHaveBeenCalled()
  })
})
