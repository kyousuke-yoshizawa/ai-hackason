import { sendError, type JsonResponder } from './respond.js'

export interface MethodRequest {
  method?: string
}

export interface HeaderResponder extends JsonResponder {
  setHeader(name: string, value: string): unknown
}

// メソッド不一致時に Allow ヘッダと 405 レスポンスを送出し false を返す。
// 呼び出し側は `if (!requireMethod(req, res, ['POST'])) return` の形で使う。
export function requireMethod(req: MethodRequest, res: HeaderResponder, allowed: string[]): boolean {
  if (req.method && allowed.includes(req.method)) {
    return true
  }
  res.setHeader('Allow', allowed.join(', '))
  sendError(res, 405, 'method_not_allowed', 'Method not allowed')
  return false
}
