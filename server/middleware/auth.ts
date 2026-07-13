import { NextFunction, Request, Response } from 'express'
import { supabaseAdmin } from '../db.js'

export interface AuthedUser {
  id: string
  email: string
  role: string
  store_id: string | null
}

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

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, email, role, store_id')
    .eq('id', userId)
    .eq('is_active', true)
    .single()

  if (error || !data) {
    return res.status(401).json({ error: '認証情報が無効です' })
  }

  req.authedUser = data
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

export const requireAdminOrStoreManager = (storeIdParam = 'id') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const storeId = req.params[storeIdParam]
    const isOwningManager =
      req.authedUser?.role === 'store_manager' && req.authedUser?.store_id === storeId
    if (req.authedUser?.role !== 'admin' && !isOwningManager) {
      return res.status(403).json({ error: '権限がありません' })
    }
    next()
  }
}
