-- 店舗マスタテーブル作成 + users テーブル拡張スクリプト
-- 対象Issue: #17 [Feature] ユーザ・店舗マスタ-DB スキーマ設計
-- 作成日：2026年7月13日
-- 目的：店舗情報の管理、ユーザと店舗の紐付け（店舗責任者ロール）

-- ============================================================
-- 1. stores テーブル新規作成
-- ============================================================
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  x NUMERIC(6, 2) NOT NULL,
  y NUMERIC(6, 2) NOT NULL,
  open_time TIME,
  close_time TIME,
  price_min INTEGER,
  price_max INTEGER,
  created_by UUID NOT NULL REFERENCES users(id),
  deleted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE stores IS '店舗情報を管理するマスタテーブル';
COMMENT ON COLUMN stores.id IS '店舗ID（UUID）';
COMMENT ON COLUMN stores.name IS '店舗名';
COMMENT ON COLUMN stores.category IS '店舗カテゴリ';
COMMENT ON COLUMN stores.x IS 'マップ上のX座標（0-300）';
COMMENT ON COLUMN stores.y IS 'マップ上のY座標（0-300）';
COMMENT ON COLUMN stores.open_time IS '開店時刻';
COMMENT ON COLUMN stores.close_time IS '閉店時刻';
COMMENT ON COLUMN stores.price_min IS '価格帯下限';
COMMENT ON COLUMN stores.price_max IS '価格帯上限';
COMMENT ON COLUMN stores.created_by IS '登録した管理者/店舗責任者（users.id）';
COMMENT ON COLUMN stores.deleted_at IS 'ソフトデリート日時（NULLの場合は有効な店舗）';

-- ============================================================
-- 2. users テーブル拡張
-- ============================================================

-- role の許容値を admin / store_manager / user に制限
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS chk_users_role;

ALTER TABLE users
  ADD CONSTRAINT chk_users_role CHECK (role IN ('admin', 'store_manager', 'user'));

-- store_id: store_manager が担当する店舗への参照（管理者・一般ユーザは NULL）
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);

COMMENT ON COLUMN users.store_id IS '担当店舗ID（store_manager のみ設定、それ以外はNULL）';

-- ============================================================
-- 3. インデックス作成
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_store_id ON users(store_id);
CREATE INDEX IF NOT EXISTS idx_stores_category ON stores(category);
CREATE INDEX IF NOT EXISTS idx_stores_created_by ON stores(created_by);

-- ============================================================
-- 4. 動作確認用クエリ（TC-101-01〜TC-101-03 相当）
-- ============================================================

-- TC-101-02: users テーブル構造検証
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users';

-- TC-101-03: インデックス存在確認
-- SELECT indexname FROM pg_indexes WHERE tablename IN ('users', 'stores');

-- TC-101-05: email UNIQUE 制約検証（重複INSERTでエラーになることを確認）
-- INSERT INTO users (email, name, password, role) VALUES ('yoshizawa@ai-hackason.example', 'dup', 'x', 'user');

SELECT * FROM stores;
SELECT id, email, name, role, store_id FROM users;
