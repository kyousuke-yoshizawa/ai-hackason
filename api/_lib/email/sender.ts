import { renderCongestionReportHtml, renderCongestionReportSubject } from './templates'
import { sendEmail } from './mailer'
import {
  listDueNotifications,
  markNotificationSent,
  recordNotificationFailure,
  recordSendLog,
  resolveRecipient,
  type DueNotification,
} from './repository'

function buildActionUrl(linkToken: string | null): string | undefined {
  if (!linkToken) return undefined
  const baseUrl = process.env.VITE_APP_URL ?? ''
  return baseUrl ? `${baseUrl}/crowd-status/update?token=${linkToken}` : undefined
}

export async function processNotification(notification: DueNotification): Promise<void> {
  const attemptNumber = notification.retryCount + 1

  let recipientEmail: string | undefined
  try {
    const recipient = await resolveRecipient(notification.storeId, notification.managerId)
    recipientEmail = recipient.recipientEmail

    const html = renderCongestionReportHtml({
      storeName: recipient.storeName,
      level: recipient.level,
      updatedAt: new Date().toISOString(),
      actionUrl: buildActionUrl(notification.linkToken),
    })
    const subject = renderCongestionReportSubject({
      storeName: recipient.storeName,
      level: recipient.level,
      updatedAt: new Date().toISOString(),
    })

    const result = await sendEmail({ to: recipient.recipientEmail, subject, html })

    if (result.success) {
      await markNotificationSent(notification.id)
      await recordSendLog({
        notificationId: notification.id,
        recipientEmail: recipient.recipientEmail,
        status: 'sent',
        providerMessageId: result.providerMessageId,
        attemptNumber,
      })
      return
    }

    await recordNotificationFailure(
      notification.id,
      attemptNumber,
      result.errorMessage ?? 'unknown error',
    )
    await recordSendLog({
      notificationId: notification.id,
      recipientEmail: recipient.recipientEmail,
      status: 'failed',
      errorMessage: result.errorMessage ?? 'unknown error',
      attemptNumber,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    await recordNotificationFailure(notification.id, attemptNumber, errorMessage)
    await recordSendLog({
      notificationId: notification.id,
      recipientEmail: recipientEmail ?? 'unknown',
      status: 'failed',
      errorMessage,
      attemptNumber,
    })
  }
}

export async function processDueNotifications(limit = 20): Promise<number> {
  const due = await listDueNotifications(limit)

  for (const notification of due) {
    await processNotification(notification)
  }

  return due.length
}
