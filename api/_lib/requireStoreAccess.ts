import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabaseAdmin } from './supabaseAdmin.js'
import { isStoreManager } from './crowd/repository.js'

// ⚠️ requireAdmin.ts と同じ既知の制約：x-user-id ヘッダーをそのまま信頼している
// プロトタイプ実装。本番運用前に Supabase Auth + JWT 検証への切り替えが必須。
export const requireStoreAccess = async (
  req: VercelRequest,
  res: VercelResponse,
  storeId: string,
): Promise<string | null> => {
  const userId = req.headers['x-user-id']

  if (!userId || typeof userId !== 'string') {
    res.status(401).json({ error: 'x-user-id header is required' })
    return null
  }

  const { data, error } = await supabaseAdmin.from('users').select('id, role').eq('id', userId).single()

  if (error || !data) {
    res.status(403).json({ error: 'store manager or admin role required' })
    return null
  }

  if (data.role === 'admin') {
    return data.id
  }

  if (await isStoreManager(storeId, data.id)) {
    return data.id
  }

  res.status(403).json({ error: 'store manager or admin role required' })
  return null
}
