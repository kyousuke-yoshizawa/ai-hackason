jest.mock('../../api/_lib/supabaseAdmin', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createFakeSupabaseClient } = require('../testUtils/fakeSupabase')
  return { supabaseAdmin: createFakeSupabaseClient() }
})

jest.mock('../../api/_lib/email/mailer', () => ({
  sendEmail: jest.fn(),
}))

import { supabaseAdmin } from '../../api/_lib/supabaseAdmin'
import { sendEmail } from '../../api/_lib/email/mailer'
import type { FakeSupabaseClient } from '../testUtils/fakeSupabase'
import {
  listDueNotifications,
  markNotificationSent,
  recordNotificationFailure,
  recordSendLog,
  resolveRecipient,
} from '../../api/_lib/email/repository'
import { processDueNotifications } from '../../api/_lib/email/sender'

const fakeClient = supabaseAdmin as unknown as FakeSupabaseClient

function seedBaseData() {
  fakeClient.seed('stores', [{ id: 'store-1', name: '渋谷店' }])
  fakeClient.seed('users', [{ id: 'manager-1', email: 'manager@store.example' }])
  fakeClient.seed('crowd_status', [{ store_id: 'store-1', level: 'high' }])
}

// TC-108-02: メール キュー（email_notifications）への insert / update / delete 相当の操作テスト
describe('email notification repository (TC-108-02)', () => {
  beforeEach(() => {
    fakeClient.reset()
    seedBaseData()
  })

  it('lists only due, unsent notifications under the retry limit', async () => {
    fakeClient.seed('email_notifications', [
      {
        id: 'notif-due',
        store_id: 'store-1',
        manager_id: 'manager-1',
        link_token: null,
        is_sent: false,
        scheduled_time: new Date(Date.now() - 1000).toISOString(),
        retry_count: 0,
        max_retries: 3,
      },
      {
        id: 'notif-future',
        store_id: 'store-1',
        manager_id: 'manager-1',
        link_token: null,
        is_sent: false,
        scheduled_time: new Date(Date.now() + 60_000).toISOString(),
        retry_count: 0,
        max_retries: 3,
      },
      {
        id: 'notif-exhausted',
        store_id: 'store-1',
        manager_id: 'manager-1',
        link_token: null,
        is_sent: false,
        scheduled_time: new Date(Date.now() - 1000).toISOString(),
        retry_count: 3,
        max_retries: 3,
      },
    ])

    const due = await listDueNotifications()

    expect(due.map((n) => n.id)).toEqual(['notif-due'])
  })

  it('resolves the recipient by joining stores, users and crowd_status', async () => {
    const recipient = await resolveRecipient('store-1', 'manager-1')

    expect(recipient).toEqual({
      storeName: '渋谷店',
      recipientEmail: 'manager@store.example',
      level: 'high',
    })
  })

  it('marks a notification as sent', async () => {
    fakeClient.seed('email_notifications', [
      { id: 'notif-1', is_sent: false, sent_at: null, retry_count: 0, max_retries: 3 },
    ])

    await markNotificationSent('notif-1')

    const row = fakeClient.getRows('email_notifications')[0]
    expect(row.is_sent).toBe(true)
    expect(row.sent_at).toBeTruthy()
  })

  it('records retry_count and last_error on failure', async () => {
    fakeClient.seed('email_notifications', [
      { id: 'notif-1', is_sent: false, retry_count: 0, max_retries: 3, last_error: null },
    ])

    await recordNotificationFailure('notif-1', 1, 'SendGrid timeout')

    const row = fakeClient.getRows('email_notifications')[0]
    expect(row.retry_count).toBe(1)
    expect(row.last_error).toBe('SendGrid timeout')
  })

  it('inserts a send log entry', async () => {
    await recordSendLog({
      notificationId: 'notif-1',
      recipientEmail: 'manager@store.example',
      status: 'sent',
      providerMessageId: 'sg-1',
      attemptNumber: 1,
    })

    const rows = fakeClient.getRows('email_send_logs')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ status: 'sent', provider_message_id: 'sg-1' })
  })
})

// TC-108-INT-01: キュー（email_notifications） → メール送信 → ログ記録 → リトライの一連フロー検証
describe('email notification queue -> send -> log integration flow (TC-108-INT-01)', () => {
  beforeEach(() => {
    fakeClient.reset()
    seedBaseData()
    ;(sendEmail as jest.Mock).mockReset()
  })

  it('sends the due notification and records a success log', async () => {
    fakeClient.seed('email_notifications', [
      {
        id: 'notif-1',
        store_id: 'store-1',
        manager_id: 'manager-1',
        link_token: null,
        is_sent: false,
        scheduled_time: new Date(Date.now() - 1000).toISOString(),
        retry_count: 0,
        max_retries: 3,
      },
    ])
    ;(sendEmail as jest.Mock).mockResolvedValueOnce({ success: true, providerMessageId: 'sg-1' })

    const processedCount = await processDueNotifications()

    expect(processedCount).toBe(1)
    const notification = fakeClient.getRows('email_notifications')[0]
    expect(notification.is_sent).toBe(true)

    const logs = fakeClient.getRows('email_send_logs')
    expect(logs).toHaveLength(1)
    expect(logs[0]).toMatchObject({ status: 'sent', recipient_email: 'manager@store.example' })
  })

  it('retries on failure and stops once max_retries is exceeded', async () => {
    fakeClient.seed('email_notifications', [
      {
        id: 'notif-1',
        store_id: 'store-1',
        manager_id: 'manager-1',
        link_token: null,
        is_sent: false,
        scheduled_time: new Date(Date.now() - 1000).toISOString(),
        retry_count: 0,
        max_retries: 2,
      },
    ])
    ;(sendEmail as jest.Mock).mockResolvedValue({ success: false, errorMessage: 'SendGrid timeout' })

    expect(await processDueNotifications()).toBe(1)
    expect(fakeClient.getRows('email_notifications')[0].retry_count).toBe(1)

    expect(await processDueNotifications()).toBe(1)
    expect(fakeClient.getRows('email_notifications')[0].retry_count).toBe(2)

    // retry_count (2) は max_retries (2) に達したため、以降は配信対象から外れる
    expect(await processDueNotifications()).toBe(0)

    const notification = fakeClient.getRows('email_notifications')[0]
    expect(notification.is_sent).toBe(false)
    expect(notification.retry_count).toBe(2)

    const logs = fakeClient.getRows('email_send_logs')
    expect(logs).toHaveLength(2)
    expect(logs.every((log) => log.status === 'failed')).toBe(true)
  })
})
