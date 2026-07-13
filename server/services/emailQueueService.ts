import { supabaseAdmin } from '../lib/supabaseAdmin.js'
import type { CreateEmailQueueInput, EmailQueueItem, EmailQueueStatus } from '../types/email.js'

interface EmailQueueRow {
  id: string
  recipient_email: string
  recipient_name: string | null
  subject: string
  store_id: string | null
  payload: EmailQueueItem['payload']
  status: EmailQueueStatus
  retry_count: number
  max_retries: number
  last_error: string | null
  scheduled_at: string
  sent_at: string | null
  created_at: string
  updated_at: string
}

function toEmailQueueItem(row: EmailQueueRow): EmailQueueItem {
  return {
    id: row.id,
    recipientEmail: row.recipient_email,
    recipientName: row.recipient_name,
    subject: row.subject,
    storeId: row.store_id,
    payload: row.payload,
    status: row.status,
    retryCount: row.retry_count,
    maxRetries: row.max_retries,
    lastError: row.last_error,
    scheduledAt: row.scheduled_at,
    sentAt: row.sent_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function enqueueEmail(input: CreateEmailQueueInput): Promise<EmailQueueItem> {
  const { data, error } = await supabaseAdmin
    .from('email_queue')
    .insert({
      recipient_email: input.recipientEmail,
      recipient_name: input.recipientName ?? null,
      subject: input.subject,
      store_id: input.storeId ?? null,
      payload: input.payload,
      scheduled_at: input.scheduledAt ?? new Date().toISOString(),
      max_retries: input.maxRetries ?? 3,
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Failed to enqueue email: ${error?.message ?? 'unknown error'}`)
  }

  return toEmailQueueItem(data as EmailQueueRow)
}

export async function listPendingEmails(limit = 20): Promise<EmailQueueItem[]> {
  const { data, error } = await supabaseAdmin
    .from('email_queue')
    .select()
    .eq('status', 'pending')
    .lte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(limit)

  if (error) {
    throw new Error(`Failed to list pending emails: ${error.message}`)
  }

  return (data as EmailQueueRow[]).map(toEmailQueueItem)
}

export async function markQueueItemProcessing(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('email_queue')
    .update({ status: 'processing', updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to mark email queue item as processing: ${error.message}`)
  }
}

export async function markQueueItemSent(id: string): Promise<void> {
  const now = new Date().toISOString()
  const { error } = await supabaseAdmin
    .from('email_queue')
    .update({ status: 'sent', sent_at: now, updated_at: now })
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to mark email queue item as sent: ${error.message}`)
  }
}

export async function markQueueItemFailedOrRetry(
  id: string,
  retryCount: number,
  maxRetries: number,
  errorMessage: string,
): Promise<EmailQueueStatus> {
  const nextStatus: EmailQueueStatus = retryCount < maxRetries ? 'pending' : 'failed'

  const { error } = await supabaseAdmin
    .from('email_queue')
    .update({
      status: nextStatus,
      retry_count: retryCount,
      last_error: errorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to update email queue item after failure: ${error.message}`)
  }

  return nextStatus
}

export async function deleteQueueItem(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from('email_queue').delete().eq('id', id)

  if (error) {
    throw new Error(`Failed to delete email queue item: ${error.message}`)
  }
}
