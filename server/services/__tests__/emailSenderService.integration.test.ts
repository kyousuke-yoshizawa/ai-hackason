import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FakeSupabaseClient } from './testUtils/fakeSupabase.js'

vi.mock('../../lib/supabaseAdmin.js', async () => {
  const { createFakeSupabaseClient } = await import('./testUtils/fakeSupabase.js')
  return { supabaseAdmin: createFakeSupabaseClient() }
})

vi.mock('../sendGridClient.js', () => ({
  sendEmail: vi.fn(),
}))

import { supabaseAdmin } from '../../lib/supabaseAdmin.js'
import { sendEmail } from '../sendGridClient.js'
import {
  processPendingQueue,
  processQueueItem,
  queueCongestionReportEmail,
} from '../emailSenderService.js'

const fakeClient = supabaseAdmin as unknown as FakeSupabaseClient

const samplePayload = {
  storeName: '新宿店',
  congestionLevel: 'medium' as const,
  currentVisitorCount: 40,
  capacity: 100,
  reportedAt: '2026-07-13T10:00:00.000Z',
}

// TC-108-INT-01: キュー → メール送信 → ログ記録の一連フロー検証
describe('email queue -> send -> log integration flow (TC-108-INT-01)', () => {
  beforeEach(() => {
    fakeClient.reset()
    vi.mocked(sendEmail).mockReset()
  })

  it('marks the queue item sent and records a success log on the first attempt', async () => {
    vi.mocked(sendEmail).mockResolvedValueOnce({ success: true, providerMessageId: 'sg-1' })

    const queued = await queueCongestionReportEmail({
      recipientEmail: 'owner@store.example',
      subject: '件名',
      payload: samplePayload,
    })

    await processQueueItem(queued)

    const queueRows = fakeClient.getRows('email_queue')
    const logRows = fakeClient.getRows('email_logs')

    expect(queueRows.find((row) => row.id === queued.id)?.status).toBe('sent')
    expect(logRows).toHaveLength(1)
    expect(logRows[0]).toMatchObject({
      queue_id: queued.id,
      status: 'sent',
      provider_message_id: 'sg-1',
      attempt_number: 1,
    })
  })

  it('retries on failure, then marks failed once max retries are exceeded', async () => {
    vi.mocked(sendEmail).mockResolvedValue({ success: false, errorMessage: 'SendGrid timeout' })

    const queued = await queueCongestionReportEmail({
      recipientEmail: 'owner@store.example',
      subject: '件名',
      payload: samplePayload,
      maxRetries: 2,
    })

    await processQueueItem(queued)

    const afterFirstAttempt = fakeClient.getRows('email_queue').find((row) => row.id === queued.id)
    expect(afterFirstAttempt?.status).toBe('pending')
    expect(afterFirstAttempt?.retry_count).toBe(1)

    await processQueueItem({ ...queued, retryCount: 1, status: 'pending' })

    const afterSecondAttempt = fakeClient.getRows('email_queue').find((row) => row.id === queued.id)
    expect(afterSecondAttempt?.status).toBe('failed')

    const logRows = fakeClient.getRows('email_logs')
    expect(logRows).toHaveLength(2)
    expect(logRows.every((row) => row.status === 'failed')).toBe(true)
  })

  it('processes all pending items in the queue', async () => {
    vi.mocked(sendEmail).mockResolvedValue({ success: true, providerMessageId: 'sg-batch' })

    await queueCongestionReportEmail({
      recipientEmail: 'owner-a@store.example',
      subject: '件名A',
      payload: samplePayload,
    })
    await queueCongestionReportEmail({
      recipientEmail: 'owner-b@store.example',
      subject: '件名B',
      payload: samplePayload,
    })

    const processedCount = await processPendingQueue()

    expect(processedCount).toBe(2)
    expect(fakeClient.getRows('email_queue').every((row) => row.status === 'sent')).toBe(true)
  })
})
