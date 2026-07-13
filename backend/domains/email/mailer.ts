import nodemailer, { type Transporter } from 'nodemailer'

export interface SendEmailInput {
  to: string
  subject: string
  html: string
}

export interface SendEmailResult {
  success: boolean
  providerMessageId?: string
  errorMessage?: string
}

let transporter: Transporter | null = null

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY ?? '',
      },
    })
  }
  return transporter
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  try {
    const info = await getTransporter().sendMail({
      to: input.to,
      from: {
        address: process.env.EMAIL_FROM_ADDRESS ?? 'notify@ai-hackason.example',
        name: process.env.EMAIL_FROM_NAME ?? 'AI Hackathon 混雑通知',
      },
      subject: input.subject,
      html: input.html,
    })

    return { success: true, providerMessageId: info.messageId }
  } catch (error) {
    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : String(error),
    }
  }
}
