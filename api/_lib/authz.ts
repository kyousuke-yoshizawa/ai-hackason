import { supabaseAdmin } from './supabaseAdmin.js'
import { isStoreManager } from './crowd/repository.js'

// 認可ロジックの単一の窓口。Express（server/）と Vercel Functions（api/）の
// 両方がここを経由することで、is_active チェックと店舗管理者判定を一本化する。
//
// ⚠️ 既知の制約：本アプリは Supabase Auth を使わず、x-user-id ヘッダーの値を
// そのまま信頼している（正規の JWT セッションが存在しない）。原理的になりすまし
// 可能。本番運用前に Supabase Auth への移行と JWT 検証への切り替えが必須（詳細は
// docs/architecture-audit/refactoring-handbook.md T21）。

export interface AuthedUser {
  id: string
  email: string
  role: string
}

export async function getActiveUser(userId: string | undefined | null): Promise<AuthedUser | null> {
  if (!userId) return null

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, email, role')
    .eq('id', userId)
    .eq('is_active', true)
    .single()

  if (error || !data) return null
  return data
}

export async function requireAdmin(userId: string | undefined | null): Promise<AuthedUser | null> {
  const user = await getActiveUser(userId)
  if (!user || user.role !== 'admin') return null
  return user
}

// 店舗管理者判定は store_managers テーブルを正とする（users.store_id は使わない）
export async function requireStoreAccess(
  userId: string | undefined | null,
  storeId: string,
): Promise<AuthedUser | null> {
  const user = await getActiveUser(userId)
  if (!user) return null
  if (user.role === 'admin') return user
  if (await isStoreManager(storeId, user.id)) return user
  return null
}
