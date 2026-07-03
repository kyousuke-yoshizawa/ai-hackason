-- ユーザマスタテーブル作成スクリプト
-- 作成日：2026年7月3日
-- 目的：ユーザーの登録・認証情報を管理

-- テーブル作成
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- インデックス作成（検索パフォーマンス向上）
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);

-- テーブルコメント
COMMENT ON TABLE users IS 'ユーザ認証・登録情報を管理するマスタテーブル';
COMMENT ON COLUMN users.id IS 'ユーザID（UUID）';
COMMENT ON COLUMN users.email IS 'メールアドレス（ログインID）';
COMMENT ON COLUMN users.name IS 'ユーザ名';
COMMENT ON COLUMN users.password IS 'パスワード（ハッシュ化）';
COMMENT ON COLUMN users.role IS 'ユーザ権限';
COMMENT ON COLUMN users.is_active IS 'アクティブ状態';
COMMENT ON COLUMN users.created_at IS '作成日時';
COMMENT ON COLUMN users.updated_at IS '更新日時';

-- テストデータ挿入
-- ※ パスワードは実際にはハッシュ化が必要です
-- 下記は例示用です（実環境では必ずハッシュ化してください）

INSERT INTO users (email, name, password, role) VALUES
  (
    'yoshizawa@ai-hackason.example',
    '吉沢',
    '$2b$10$NexusPlatformHashedPassword123456789012345678901234567890',
    'admin'
  ),
  (
    'satoh@ai-hackason.example',
    '佐藤',
    '$2b$10$NexusPlatformHashedPassword123456789012345678901234567890',
    'user'
  ),
  (
    'itagaki@ai-hackason.example',
    '板垣',
    '$2b$10$NexusPlatformHashedPassword123456789012345678901234567890',
    'user'
  ),
  (
    'takayanagi@ai-hackason.example',
    '高柳',
    '$2b$10$NexusPlatformHashedPassword123456789012345678901234567890',
    'user'
  );

-- 挿入確認
SELECT * FROM users;
