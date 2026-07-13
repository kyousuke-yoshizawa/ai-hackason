-- RLS（行レベルセキュリティ）ポリシー実装スクリプト
-- 作成日：2026年7月13日
-- 目的：ロール別データアクセス制限（Issue #21）
--
-- ⚠️ 前提条件・既知の制約：
-- 現状の AuthContext.login() は Supabase Auth を使わず、
-- anon key で users テーブルを直接 SELECT してメール/パスワード照合している。
-- そのため auth.uid() は現ログインフローでは NULL のままとなり、
-- 「本人のみ自身のプロファイル閲覧可」ポリシーは Supabase Auth 移行後でないと機能しない。
-- 本スクリプトは Issue #21 の要件どおり auth.uid() ベースで実装するが、
-- Supabase Auth 移行（別 Issue 化を推奨）までは admin 判定のみ実質的に有効。
--
-- ⚠️ 依存関係：
-- stores / crowd_snapshots / likes / reviews / reservations は
-- Issue #17（ユーザ・店舗マスタ DB スキーマ設計）が未完了のため
-- テーブル自体が存在しない。当該テーブルの RLS は #17 完了後に追加すること。

-- ============================================
-- users テーブル RLS
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- admin は全行を読み取り可能（TC-105-01）
CREATE POLICY users_select_admin ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- 本人は自身のプロファイルのみ閲覧可能
CREATE POLICY users_select_self ON users
  FOR SELECT
  USING (id = auth.uid());

-- admin のみ更新・削除可能
CREATE POLICY users_update_admin ON users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY users_delete_admin ON users
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- ============================================
-- 以下、Issue #17 完了後に追加予定（現時点でテーブル未作成のためブロック中）
-- ============================================
-- stores: 全員読み取り可、store_manager は自身の店舗のみ編集可
-- crowd_snapshots: 全員読み取り可
-- likes / reviews / reservations: 対応する制限
