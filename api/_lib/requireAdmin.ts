import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabaseAdmin } from './supabaseAdmin'

// ⚠️ 既知の制約：本アプリは Supabase Auth を使わず client 側で users テーブルを
// 直接照会するプロトタイプ実装のため、正規の JWT セッションが存在しない。
// そのため x-user-id ヘッダーの値をそのまま信頼しており、原理的になりすまし可能。
// 本番運用前に Supabase Auth への移行と JWT 検証への切り替えが必須。
export const requireAdmin = async (
  req: VercelRequest,
  res: VercelResponse,
): Promise<string | null> => {
  const userId = req.headers['x-user-id']

  if (!userId || typeof userId !== 'string') {
    res.status(401).json({ error: 'x-user-id header is required' })
    return null
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, role')
    .eq('id', userId)
    .single()

  if (error || !data || data.role !== 'admin') {
    res.status(403).json({ error: 'admin role required' })
    return null
  }

  return data.id
}
