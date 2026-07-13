export type EmailQueueStatus = 'pending' | 'processing' | 'sent' | 'failed'

export type EmailLogStatus = 'sent' | 'failed'

export interface CongestionReportData {
  storeName: string
  congestionLevel: 'low' | 'medium' | 'high'
  currentVisitorCount: number
  capacity: number
  reportedAt: string
}

export interface EmailQueueItem {
  id: string
  recipientEmail: string
  recipientName: string | null
  subject: string
  storeId: string | null
  payload: CongestionReportData
  status: EmailQueueStatus
  retryCount: number
  maxRetries: number
  lastError: string | null
  scheduledAt: string
  sentAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateEmailQueueInput {
  recipientEmail: string
  recipientName?: string
  subject: string
  storeId?: string
  payload: CongestionReportData
  scheduledAt?: string
  maxRetries?: number
}

export interface EmailLogEntry {
  id: string
  queueId: string | null
  recipientEmail: string
  subject: string
  status: EmailLogStatus
  providerMessageId: string | null
  errorMessage: string | null
  attemptNumber: number
  createdAt: string
}

export interface CreateEmailLogInput {
  queueId: string | null
  recipientEmail: string
  subject: string
  status: EmailLogStatus
  providerMessageId?: string | null
  errorMessage?: string | null
  attemptNumber: number
}

export interface SendEmailResult {
  success: boolean
  providerMessageId?: string
  errorMessage?: string
}
