import { Router } from 'express'
import {
  processPendingQueue,
  processQueueItem,
  queueCongestionReportEmail,
} from '../services/emailSenderService.js'
import { renderCongestionReportSubject } from '../services/emailTemplates.js'
import type { CongestionReportData } from '../types/email.js'

export const mailRouter = Router()

interface SendMailRequestBody {
  recipientEmail: string
  recipientName?: string
  storeId?: string
  congestionReport: CongestionReportData
}

mailRouter.post('/send', async (req, res) => {
  const body = req.body as SendMailRequestBody

  if (!body?.recipientEmail || !body?.congestionReport) {
    res.status(400).json({ error: 'recipientEmail and congestionReport are required' })
    return
  }

  try {
    const queueItem = await queueCongestionReportEmail({
      recipientEmail: body.recipientEmail,
      recipientName: body.recipientName,
      storeId: body.storeId,
      subject: renderCongestionReportSubject(body.congestionReport),
      payload: body.congestionReport,
    })

    await processQueueItem(queueItem)

    res.status(202).json({ queueId: queueItem.id })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'unknown error' })
  }
})

mailRouter.post('/process-queue', async (_req, res) => {
  try {
    const processedCount = await processPendingQueue()
    res.status(200).json({ processedCount })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'unknown error' })
  }
})
