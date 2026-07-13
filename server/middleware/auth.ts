import { NextFunction, Request, Response } from 'express'
import { getActiveUser, type AuthedUser } from '../../backend/auth/authz.js'
import { isStoreManager } from '../../backend/domains/crowd/repository.js'

export type { AuthedUser }

declare module 'express-serve-static-core' {
  interface Request {
    authedUser?: AuthedUser
  }
}

// ハッカソン規模の簡易認証: フロントは localStorage のユーザIDを x-user-id ヘッダで送る想定
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.header('x-user-id')
  if (!userId) {
    return res.status(401).json({ error: '認証が必要です' })
  }

  const user = await getActiveUser(userId)
  if (!user) {
    return res.status(401).json({ error: '認証情報が無効です' })
  }

  req.authedUser = user
  next()
}

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.authedUser?.role !== 'admin') {
    return res.status(403).json({ error: '管理者権限が必要です' })
  }
  next()
}

export const requireAdminOrSelf = (paramName = 'id') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const targetId = req.params[paramName]
    if (req.authedUser?.role !== 'admin' && req.authedUser?.id !== targetId) {
      return res.status(403).json({ error: '権限がありません' })
    }
    next()
  }
}

// 店舗管理者判定は store_managers テーブルを正とする（users.store_id は使わない。
// backend/auth/authz.ts の requireStoreAccess と同じ判定ソース）
export const requireAdminOrStoreManager = (storeIdParam = 'id') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const storeId = req.params[storeIdParam]
    if (req.authedUser?.role === 'admin') {
      return next()
    }
    if (req.authedUser && (await isStoreManager(storeId, req.authedUser.id))) {
      return next()
    }
    return res.status(403).json({ error: '権限がありません' })
  }
}
