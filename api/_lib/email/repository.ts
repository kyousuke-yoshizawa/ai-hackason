import { supabaseAdmin } from '../supabaseAdmin.js'
import type { CongestionLevel } from './templates.js'

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

export interface StoreManager {
  storeId: string
  managerId: string
}

export async function listStoreManagers(): Promise<StoreManager[]> {
  const { data, error } = await supabaseAdmin.from('store_managers').select('store_id, manager_id')

  if (error) {
    throw new Error(`Failed to list store managers: ${error.message}`)
  }

  return (data ?? []).map((row) => ({ storeId: row.store_id, managerId: row.manager_id }))
}

export async function insertNotification(storeId: string, managerId: string): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from('email_notifications')
    .insert({
      store_id: storeId,
      manager_id: managerId,
      notification_type: 'crowd_update',
      scheduled_time: new Date().toISOString(),
      is_sent: false,
      retry_count: 0,
      max_retries: 3,
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(`Failed to insert email notification: ${error?.message ?? 'unknown error'}`)
  }

  return data.id
}

export async function setNotificationLinkToken(
  id: string,
  linkToken: string,
  expiresAt: Date,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('email_notifications')
    .update({ link_token: linkToken, link_token_expires_at: expiresAt.toISOString() })
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to set notification link token: ${error.message}`)
  }
}

export interface NotificationLinkState {
  id: string
  storeId: string
  managerId: string
  linkUsedAt: string | null
}

export async function getNotificationById(id: string): Promise<NotificationLinkState | null> {
  const { data, error } = await supabaseAdmin
    .from('email_notifications')
    .select('id, store_id, manager_id, link_used_at')
    .eq('id', id)
    .single()

  if (error || !data) {
    return null
  }

  return {
    id: data.id,
    storeId: data.store_id,
    managerId: data.manager_id,
    linkUsedAt: data.link_used_at,
  }
}

export async function markNotificationLinkUsed(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('email_notifications')
    .update({ link_used_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to mark notification link as used: ${error.message}`)
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
