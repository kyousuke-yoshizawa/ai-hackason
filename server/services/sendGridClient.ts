import sgMail from '@sendgrid/mail'
import { env } from '../config/env.js'
import type { SendEmailResult } from '../types/email.js'

let initialized = false

function ensureInitialized(): void {
  if (!initialized) {
    sgMail.setApiKey(env.sendgridApiKey)
    initialized = true
  }
}

export interface SendEmailInput {
  to: string
  subject: string
  html: string
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  ensureInitialized()

  try {
    const [response] = await sgMail.send({
      to: input.to,
      from: { email: env.emailFromAddress, name: env.emailFromName },
      subject: input.subject,
      html: input.html,
    })

    return {
      success: true,
      providerMessageId: response.headers['x-message-id'] as string | undefined,
    }
  } catch (error) {
    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : String(error),
    }
  }
}
