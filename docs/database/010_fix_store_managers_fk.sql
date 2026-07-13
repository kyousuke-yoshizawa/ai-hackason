-- T04: store_managers.manager_id の外部キー参照先の誤りを修正
--
-- 背景: docs/architecture-audit/refactoring-handbook.md T04
-- 002_create_new_features_schema.sql で store_managers.manager_id は
-- auth.users(id)（Supabase Auth のユーザテーブル）を参照しているが、
-- 本アプリは Supabase Auth を使わず、独自の users テーブル（001_create_users_table.sql）
-- で認証・ユーザ管理を行っている。そのため実際のユーザID（users.id）を
-- manager_id に insert すると外部キー制約違反になり、store_managers への
-- 登録が機能しない。参照先を users(id) に修正する。

ALTER TABLE store_managers DROP CONSTRAINT IF EXISTS store_managers_manager_id_fkey;
ALTER TABLE store_managers
  ADD CONSTRAINT store_managers_manager_id_fkey
  FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE CASCADE;
