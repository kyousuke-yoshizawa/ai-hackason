import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FakeSupabaseClient } from './testUtils/fakeSupabase.js'

vi.mock('../../lib/supabaseAdmin.js', async () => {
  const { createFakeSupabaseClient } = await import('./testUtils/fakeSupabase.js')
  return { supabaseAdmin: createFakeSupabaseClient() }
})

import { supabaseAdmin } from '../../lib/supabaseAdmin.js'
import {
  deleteQueueItem,
  enqueueEmail,
  listPendingEmails,
  markQueueItemFailedOrRetry,
  markQueueItemProcessing,
  markQueueItemSent,
} from '../emailQueueService.js'

const fakeClient = supabaseAdmin as unknown as FakeSupabaseClient

const samplePayload = {
  storeName: '渋谷店',
  congestionLevel: 'high' as const,
  currentVisitorCount: 80,
  capacity: 100,
  reportedAt: '2026-07-13T10:00:00.000Z',
}

// TC-108-02: メール キュー への insert / update / delete テスト
describe('emailQueueService (TC-108-02)', () => {
  beforeEach(() => {
    fakeClient.reset()
  })

  it('inserts a new queue item with pending status', async () => {
    const item = await enqueueEmail({
      recipientEmail: 'owner@store.example',
      subject: '【混雑通知】渋谷店 は現在非常に混雑しています',
      payload: samplePayload,
    })

    expect(item.status).toBe('pending')
    expect(item.recipientEmail).toBe('owner@store.example')
    expect(item.retryCount).toBe(0)
  })

  it('lists only pending items scheduled at or before now', async () => {
    const item = await enqueueEmail({
      recipientEmail: 'owner@store.example',
      subject: 'subject',
      payload: samplePayload,
      scheduledAt: new Date(Date.now() - 1000).toISOString(),
    })

    const pending = await listPendingEmails()

    expect(pending.map((row) => row.id)).toContain(item.id)
  })

  it('updates status through processing -> sent', async () => {
    const item = await enqueueEmail({
      recipientEmail: 'owner@store.example',
      subject: 'subject',
      payload: samplePayload,
    })

    await markQueueItemProcessing(item.id)
    await markQueueItemSent(item.id)

    const [updated] = await listPendingEmails()
    expect(updated).toBeUndefined()
  })

  it('retries when retryCount is below maxRetries, fails permanently once exceeded', async () => {
    const item = await enqueueEmail({
      recipientEmail: 'owner@store.example',
      subject: 'subject',
      payload: samplePayload,
      maxRetries: 2,
    })

    const afterFirstFailure = await markQueueItemFailedOrRetry(item.id, 1, item.maxRetries, 'boom')
    expect(afterFirstFailure).toBe('pending')

    const afterSecondFailure = await markQueueItemFailedOrRetry(item.id, 2, 2, 'boom again')
    expect(afterSecondFailure).toBe('failed')
  })

  it('deletes a queue item', async () => {
    const item = await enqueueEmail({
      recipientEmail: 'owner@store.example',
      subject: 'subject',
      payload: samplePayload,
    })

    await deleteQueueItem(item.id)

    const rows = fakeClient.getRows('email_queue')
    expect(rows.find((row) => row.id === item.id)).toBeUndefined()
  })
})
