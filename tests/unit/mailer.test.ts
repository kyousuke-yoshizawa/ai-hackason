jest.mock('nodemailer', () => {
  const sendMail = jest.fn()
  return {
    createTransport: jest.fn(() => ({ sendMail })),
    __sendMail: sendMail,
  }
})

import nodemailer from 'nodemailer'
import { sendEmail } from '../../api/_lib/email/mailer'

const sendMailMock = (nodemailer as unknown as { __sendMail: jest.Mock }).__sendMail

// TC-108-01: メール送信 API の正常系テスト（mock SendGrid）
describe('sendEmail via SendGrid SMTP (TC-108-01)', () => {
  beforeEach(() => {
    sendMailMock.mockReset()
  })

  it('returns success with the provider message id when SendGrid accepts the mail', async () => {
    sendMailMock.mockResolvedValueOnce({ messageId: 'sg-message-123' })

    const result = await sendEmail({
      to: 'owner@store.example',
      subject: 'テスト件名',
      html: '<p>本文</p>',
    })

    expect(result.success).toBe(true)
    expect(result.providerMessageId).toBe('sg-message-123')
  })

  it('returns failure with the error message when SendGrid rejects the mail', async () => {
    sendMailMock.mockRejectedValueOnce(new Error('invalid recipient'))

    const result = await sendEmail({
      to: 'invalid',
      subject: 'テスト件名',
      html: '<p>本文</p>',
    })

    expect(result.success).toBe(false)
    expect(result.errorMessage).toBe('invalid recipient')
  })
})
