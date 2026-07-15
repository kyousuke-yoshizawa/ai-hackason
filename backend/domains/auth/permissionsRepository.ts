import { supabaseAdmin } from '../../db.js'

export interface Permission {
  resource: string
  action: string
}

// role 名から role_permissions 経由で resource/action 一覧を取得する（Issue #22）。
// Supabase の関係埋め込み構文（select('permissions(resource,action)')）はテスト用の
// fakeSupabase が再現できないため、3段階の素朴なクエリに分けて実装している。
export async function getPermissionsForRole(roleName: string): Promise<Permission[]> {
  const { data: role, error: roleError } = await supabaseAdmin
    .from('roles')
    .select('id')
    .eq('name', roleName)
    .maybeSingle()

  if (roleError || !role) return []

  const { data: rolePermissions, error: rpError } = await supabaseAdmin
    .from('role_permissions')
    .select('permission_id')
    .eq('role_id', (role as { id: string }).id)

  if (rpError || !rolePermissions || rolePermissions.length === 0) return []

  const permissionIds = (rolePermissions as { permission_id: string }[]).map((rp) => rp.permission_id)

  const { data: permissions, error: permError } = await supabaseAdmin
    .from('permissions')
    .select('resource, action')
    .in('id', permissionIds)

  if (permError || !permissions) return []
  return permissions as Permission[]
}
