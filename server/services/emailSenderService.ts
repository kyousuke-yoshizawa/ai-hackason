import { renderCongestionReportHtml } from './emailTemplates.js'
import { sendEmail } from './sendGridClient.js'
import { recordEmailLog } from './emailLogService.js'
import {
  enqueueEmail,
  listPendingEmails,
  markQueueItemFailedOrRetry,
  markQueueItemProcessing,
  markQueueItemSent,
} from './emailQueueService.js'
import type { CreateEmailQueueInput, EmailQueueItem } from '../types/email.js'

export async function queueCongestionReportEmail(
  input: CreateEmailQueueInput,
): Promise<EmailQueueItem> {
  return enqueueEmail(input)
}

export async function processQueueItem(item: EmailQueueItem): Promise<void> {
  await markQueueItemProcessing(item.id)

  const html = renderCongestionReportHtml(item.payload)
  const attemptNumber = item.retryCount + 1
  const result = await sendEmail({ to: item.recipientEmail, subject: item.subject, html })

  if (result.success) {
    await markQueueItemSent(item.id)
    await recordEmailLog({
      queueId: item.id,
      recipientEmail: item.recipientEmail,
      subject: item.subject,
      status: 'sent',
      providerMessageId: result.providerMessageId ?? null,
      attemptNumber,
    })
    return
  }

  await markQueueItemFailedOrRetry(
    item.id,
    item.retryCount + 1,
    item.maxRetries,
    result.errorMessage ?? 'unknown error',
  )
  await recordEmailLog({
    queueId: item.id,
    recipientEmail: item.recipientEmail,
    subject: item.subject,
    status: 'failed',
    errorMessage: result.errorMessage ?? 'unknown error',
    attemptNumber,
  })
}

export async function processPendingQueue(limit = 20): Promise<number> {
  const items = await listPendingEmails(limit)

  for (const item of items) {
    await processQueueItem(item)
  }

  return items.length
}
