import { describe, expect, it, vi } from 'vitest'

vi.mock('@sendgrid/mail', () => ({
  default: {
    setApiKey: vi.fn(),
    send: vi.fn(),
  },
}))

import sgMail from '@sendgrid/mail'
import { sendEmail } from '../sendGridClient.js'

// TC-108-01: メール送信 API の正常系テスト（mock SendGrid）
describe('sendEmail (TC-108-01)', () => {
  it('returns success with provider message id when SendGrid accepts the mail', async () => {
    vi.mocked(sgMail.send).mockResolvedValueOnce([
      { headers: { 'x-message-id': 'sg-message-123' } },
      {},
    ] as never)

    const result = await sendEmail({
      to: 'owner@store.example',
      subject: 'テスト件名',
      html: '<p>本文</p>',
    })

    expect(result.success).toBe(true)
    expect(result.providerMessageId).toBe('sg-message-123')
  })

  it('returns failure with error message when SendGrid rejects the mail', async () => {
    vi.mocked(sgMail.send).mockRejectedValueOnce(new Error('invalid recipient'))

    const result = await sendEmail({
      to: 'invalid',
      subject: 'テスト件名',
      html: '<p>本文</p>',
    })

    expect(result.success).toBe(false)
    expect(result.errorMessage).toBe('invalid recipient')
  })
})
