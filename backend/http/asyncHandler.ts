import type { NextFunction, Request, RequestHandler, Response } from 'express'

// async ルートハンドラの reject を next(error) に流し、Express の
// グローバルエラーハンドラ（server/app.ts）に委譲する。各ルートの try/catch を排除するためのラッパー。
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next)
  }
}
