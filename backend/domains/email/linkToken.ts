import { createHmac, timingSafeEqual } from 'crypto'

export interface LinkTokenPayload {
  notificationId: string
  storeId: string
  managerId: string
  expiresAt: number
}

function getSecret(): string {
  const secret = process.env.LINK_TOKEN_SECRET
  if (!secret) {
    throw new Error('LINK_TOKEN_SECRET is required to sign/verify email link tokens')
  }
  return secret
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('base64url')
}

export function generateLinkToken(payload: LinkTokenPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = sign(body)
  return `${body}.${signature}`
}

export type VerifyLinkTokenResult =
  | { valid: true; payload: LinkTokenPayload }
  | { valid: false; reason: 'malformed' | 'invalid_signature' | 'expired' }

export function verifyLinkToken(token: string): VerifyLinkTokenResult {
  const [body, signature] = token.split('.')
  if (!body || !signature) {
    return { valid: false, reason: 'malformed' }
  }

  const expectedSignature = sign(body)
  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expectedSignature)
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return { valid: false, reason: 'invalid_signature' }
  }

  let payload: LinkTokenPayload
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'))
  } catch {
    return { valid: false, reason: 'malformed' }
  }

  if (typeof payload.expiresAt !== 'number' || Date.now() > payload.expiresAt) {
    return { valid: false, reason: 'expired' }
  }

  return { valid: true, payload }
}
