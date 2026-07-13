import { generateLinkToken } from '../email/linkToken'
import {
  insertNotification,
  listStoreManagers,
  setNotificationLinkToken,
} from '../email/repository'
import { processDueNotifications } from '../email/sender'

const LINK_TOKEN_TTL_MS = 30 * 60 * 1000 // 30分

export interface CongestionNotificationCycleResult {
  scheduledCount: number
  processedCount: number
}

export async function runCongestionNotificationCycle(): Promise<CongestionNotificationCycleResult> {
  const storeManagers = await listStoreManagers()

  for (const { storeId, managerId } of storeManagers) {
    const notificationId = await insertNotification(storeId, managerId)
    const expiresAt = new Date(Date.now() + LINK_TOKEN_TTL_MS)
    const linkToken = generateLinkToken({
      notificationId,
      storeId,
      managerId,
      expiresAt: expiresAt.getTime(),
    })
    await setNotificationLinkToken(notificationId, linkToken, expiresAt)
  }

  const processedCount = await processDueNotifications(storeManagers.length || 20)

  return { scheduledCount: storeManagers.length, processedCount }
}
