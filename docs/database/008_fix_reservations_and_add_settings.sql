-- 予約機能：既存reservationsテーブルの不整合修正 + reservation_settings 新設
-- 作成日：2026年7月13日
-- 目的：Issue #33（予約機能-DBスキーマ&API実装）
--
-- ⚠️ 前提：reservations テーブルは 002_create_new_features_schema.sql で作成済みだが、
--    以下2点の不整合があるため本スクリプトで修正する。
--    1. user_id が auth.users(id) を参照している。本アプリは Supabase Auth を使わず
--       独自の users テーブル（001_create_users_table.sql）を直接照会するため、
--       実際のユーザーIDでは FK制約違反になってしまう（api/_lib/requireAdmin.ts の
--       コメントにある既知の制約と同じ理由）。users(id) を参照するよう修正する。
--    2. issue が要求する cancelled_at カラムが無いため追加する。

ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_user_id_fkey;
ALTER TABLE reservations
  ADD CONSTRAINT reservations_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE reservations ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;
COMMENT ON COLUMN reservations.cancelled_at IS '予約キャンセル日時（キャンセルされていない場合はNULL）';

-- 予約設定（店舗ごとの最大人数・予約可能な前置き時間）
CREATE TABLE IF NOT EXISTS reservation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL UNIQUE REFERENCES stores(id) ON DELETE CASCADE,
  max_capacity INTEGER,
  booking_advance_hours INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE reservation_settings IS '店舗ごとの予約設定';
COMMENT ON COLUMN reservation_settings.max_capacity IS '同一時間帯の最大予約人数合計（NULLの場合は上限なし）';
COMMENT ON COLUMN reservation_settings.booking_advance_hours IS '予約可能な前置き時間（時間単位、0は当日予約も可）';
