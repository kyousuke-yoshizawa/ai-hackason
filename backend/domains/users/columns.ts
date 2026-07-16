// ユーザ管理系エンドポイント（一覧・詳細・作成・更新・削除）で使う公開カラム。
export const USER_PUBLIC_COLUMNS = 'id, email, name, role, store_id, is_active, created_at, updated_at'

// ログイン応答（server/routes/auth.ts）で使う最小カラム。is_active/created_at/updated_at は
// レスポンスに不要なため意図的に除外している。
export const USER_LOGIN_COLUMNS = 'id, email, name, role, store_id'
