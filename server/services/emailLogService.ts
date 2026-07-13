import { supabaseAdmin } from '../lib/supabaseAdmin.js'
import type { CreateEmailLogInput, EmailLogEntry } from '../types/email.js'

export async function recordEmailLog(input: CreateEmailLogInput): Promise<EmailLogEntry> {
  const { data, error } = await supabaseAdmin
    .from('email_logs')
    .insert({
      queue_id: input.queueId,
      recipient_email: input.recipientEmail,
      subject: input.subject,
      status: input.status,
      provider_message_id: input.providerMessageId ?? null,
      error_message: input.errorMessage ?? null,
      attempt_number: input.attemptNumber,
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Failed to record email log: ${error?.message ?? 'unknown error'}`)
  }

  return {
    id: data.id,
    queueId: data.queue_id,
    recipientEmail: data.recipient_email,
    subject: data.subject,
    status: data.status,
    providerMessageId: data.provider_message_id,
    errorMessage: data.error_message,
    attemptNumber: data.attempt_number,
    createdAt: data.created_at,
  }
}
