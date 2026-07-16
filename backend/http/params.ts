import { sendError, type JsonResponder } from './respond.js'

export interface QueryRequest {
  query: Record<string, unknown>
}

// クエリパラメータが string でなければ 400 を送出し null を返す。
export function requireStringParam(req: QueryRequest, res: JsonResponder, name: string): string | null {
  const value = req.query[name]
  if (typeof value !== 'string') {
    sendError(res, 400, 'validation_error', `${name} is required`)
    return null
  }
  return value
}
