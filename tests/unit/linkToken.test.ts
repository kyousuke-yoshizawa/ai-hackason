process.env.LINK_TOKEN_SECRET = 'test-secret'

import { generateLinkToken, verifyLinkToken } from '../../backend/domains/email/linkToken'

describe('signed one-time link token', () => {
  const payload = {
    notificationId: 'notif-1',
    storeId: 'store-1',
    managerId: 'manager-1',
    expiresAt: Date.now() + 30 * 60 * 1000,
  }

  it('verifies a freshly generated token', () => {
    const token = generateLinkToken(payload)
    const result = verifyLinkToken(token)

    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.payload).toEqual(payload)
    }
  })

  it('rejects an expired token', () => {
    const token = generateLinkToken({ ...payload, expiresAt: Date.now() - 1000 })
    const result = verifyLinkToken(token)

    expect(result).toEqual({ valid: false, reason: 'expired' })
  })

  it('rejects a tampered token', () => {
    const token = generateLinkToken(payload)
    const [, signature] = token.split('.')
    const forgedBody = Buffer.from(JSON.stringify({ ...payload, storeId: 'store-evil' })).toString(
      'base64url',
    )
    const tampered = `${forgedBody}.${signature}`

    expect(verifyLinkToken(tampered)).toEqual({ valid: false, reason: 'invalid_signature' })
  })

  it('rejects a malformed token', () => {
    expect(verifyLinkToken('not-a-valid-token')).toEqual({ valid: false, reason: 'malformed' })
  })
})
