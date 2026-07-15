import type { ZodError } from 'zod'

// Express の Response と Vercel の VercelResponse は両方とも
// status(code).json(body) の形を持つため、フレームワーク非依存の
// 構造的型で受け取る（backend/ に express・@vercel/node への依存を持ち込まない）。
export interface JsonResponder {
  status(code: number): { json(body: unknown): unknown }
}

// 統一エラー契約: { error: <機械可読code>, message: <人間向け日本語> }
export function sendError(res: JsonResponder, status: number, code: string, message: string): void {
  res.status(status).json({ error: code, message })
}

export function zodError(res: JsonResponder, error: ZodError, status = 400): void {
  const message = error.issues
    .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join(' / ')
  sendError(res, status, 'validation_error', message)
}
