import { supabaseAdmin } from '../supabaseAdmin'
import type { CongestionLevel } from './templates'

export interface DueNotification {
  id: string
  storeId: string
  managerId: string
  linkToken: string | null
  retryCount: number
  maxRetries: number
}

export interface NotificationRecipient {
  storeName: string
  recipientEmail: string
  level: CongestionLevel
}

export async function listDueNotifications(limit = 20): Promise<DueNotification[]> {
  const { data, error } = await supabaseAdmin
    .from('email_notifications')
    .select('id, store_id, manager_id, link_token, retry_count, max_retries')
    .eq('is_sent', false)
    .lte('scheduled_time', new Date().toISOString())
    .order('scheduled_time', { ascending: true })
    .limit(limit)

  if (error) {
    throw new Error(`Failed to list due email notifications: ${error.message}`)
  }

  return (data ?? [])
    .filter((row) => row.retry_count < row.max_retries)
    .map((row) => ({
      id: row.id,
      storeId: row.store_id,
      managerId: row.manager_id,
      linkToken: row.link_token,
      retryCount: row.retry_count,
      maxRetries: row.max_retries,
    }))
}

export async function resolveRecipient(
  storeId: string,
  managerId: string,
): Promise<NotificationRecipient> {
  const [storeResult, userResult, crowdResult] = await Promise.all([
    supabaseAdmin.from('stores').select('name').eq('id', storeId).single(),
    supabaseAdmin.from('users').select('email').eq('id', managerId).single(),
    supabaseAdmin.from('crowd_status').select('level').eq('store_id', storeId).single(),
  ])

  if (storeResult.error || !storeResult.data) {
    throw new Error(`Store not found for id ${storeId}`)
  }
  if (userResult.error || !userResult.data) {
    throw new Error(`Manager not found for id ${managerId}`)
  }
  if (crowdResult.error || !crowdResult.data) {
    throw new Error(`Crowd status not found for store ${storeId}`)
  }

  return {
    storeName: storeResult.data.name,
    recipientEmail: userResult.data.email,
    level: crowdResult.data.level,
  }
}

export async function markNotificationSent(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('email_notifications')
    .update({ is_sent: true, sent_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to mark notification as sent: ${error.message}`)
  }
}

export async function recordNotificationFailure(
  id: string,
  retryCount: number,
  errorMessage: string,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('email_notifications')
    .update({ retry_count: retryCount, last_error: errorMessage })
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to record notification failure: ${error.message}`)
  }
}

export interface RecordSendLogInput {
  notificationId: string
  recipientEmail: string
  status: 'sent' | 'failed'
  providerMessageId?: string
  errorMessage?: string
  attemptNumber: number
}

export async function recordSendLog(input: RecordSendLogInput): Promise<void> {
  const { error } = await supabaseAdmin.from('email_send_logs').insert({
    notification_id: input.notificationId,
    recipient_email: input.recipientEmail,
    status: input.status,
    provider_message_id: input.providerMessageId ?? null,
    error_message: input.errorMessage ?? null,
    attempt_number: input.attemptNumber,
  })

  if (error) {
    throw new Error(`Failed to record email send log: ${error.message}`)
  }
}
