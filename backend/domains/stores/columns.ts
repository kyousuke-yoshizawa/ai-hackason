// stores テーブルの管理系エンドポイント（一覧・詳細・作成・更新・削除）で使う全カラム。
export const STORE_COLUMNS =
  'id, name, category, x, y, open_time, close_time, price_min, price_max, tags, closed_days, last_order_time, description, sub_area, created_by, created_at, updated_at'

// プラン生成（api/plan/generate.ts）で使う店舗マスタのサブセット。
// created_by/created_at/updated_at は Claude へのプロンプトに不要なため意図的に除外している。
export const STORE_PLAN_COLUMNS =
  'id, name, category, x, y, open_time, close_time, price_min, price_max, tags, closed_days, last_order_time, description, sub_area'
