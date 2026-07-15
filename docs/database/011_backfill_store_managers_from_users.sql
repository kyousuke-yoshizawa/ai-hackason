-- T04: 店舗管理者判定を users.store_id から store_managers テーブルへ統一するための
-- バックフィル。既存ユーザで role='store_manager' かつ store_id が設定されている
-- レコードを、対応する store_managers 行として登録する（未登録の場合のみ）。
--
-- 背景: docs/architecture-audit/refactoring-handbook.md T04
-- アプリケーションコードは users.store_id を認可判定に使わなくなったため、
-- 既存データに store_managers の登録漏れがあると、これまで動いていたはずの
-- 店舗管理者アクセスが 403 になる。このマイグレーションで整合させる。

INSERT INTO store_managers (store_id, manager_id)
SELECT u.store_id, u.id
FROM users u
WHERE u.role = 'store_manager'
  AND u.store_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM store_managers sm
    WHERE sm.store_id = u.store_id AND sm.manager_id = u.id
  )
ON CONFLICT (store_id, manager_id) DO NOTHING;
