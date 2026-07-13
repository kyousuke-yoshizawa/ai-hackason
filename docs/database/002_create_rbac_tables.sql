-- RBAC（ロールベースアクセス制御）テーブル作成スクリプト
-- 作成日：2026年7月13日
-- 目的：ロール・権限・マッピングを管理する（Issue #20）

-- ロールテーブル
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE roles IS 'ロール定義（admin/store_manager/user）';
COMMENT ON COLUMN roles.name IS 'ロール名（一意）';
COMMENT ON COLUMN roles.description IS 'ロールの説明';

-- 権限テーブル
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (resource, action)
);

COMMENT ON TABLE permissions IS '権限定義（resource × action）';
COMMENT ON COLUMN permissions.resource IS '対象リソース（stores/users/crowd 等）';
COMMENT ON COLUMN permissions.action IS '操作種別（read/create/update/delete）';

-- ロール・権限マッピングテーブル
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

COMMENT ON TABLE role_permissions IS 'ロールと権限の多対多マッピング';

-- インデックス
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);

-- ロール初期データ（TC-104-01）
INSERT INTO roles (name, description) VALUES
  ('admin', '管理者：全リソースへのフルアクセス'),
  ('store_manager', '店舗責任者：自店舗のデータ管理'),
  ('user', '一般ユーザ：閲覧中心のアクセス')
ON CONFLICT (name) DO NOTHING;

-- 権限初期データ
INSERT INTO permissions (resource, action) VALUES
  ('users', 'read'), ('users', 'create'), ('users', 'update'), ('users', 'delete'),
  ('stores', 'read'), ('stores', 'create'), ('stores', 'update'), ('stores', 'delete'),
  ('crowd', 'read'), ('crowd', 'create'), ('crowd', 'update'), ('crowd', 'delete')
ON CONFLICT (resource, action) DO NOTHING;

-- ロール・権限マッピング初期データ（TC-104-02）
-- admin: 全権限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- store_manager: users は read のみ、stores は read/update、crowd は read/create
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p
  ON (p.resource = 'users' AND p.action = 'read')
  OR (p.resource = 'stores' AND p.action IN ('read', 'update'))
  OR (p.resource = 'crowd' AND p.action IN ('read', 'create'))
WHERE r.name = 'store_manager'
ON CONFLICT DO NOTHING;

-- user: すべて read のみ
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.action = 'read'
WHERE r.name = 'user'
ON CONFLICT DO NOTHING;

-- 権限照会確認（TC-104-INT-01 相当：ロール別権限一覧）
SELECT r.name AS role, p.resource, p.action
FROM role_permissions rp
JOIN roles r ON r.id = rp.role_id
JOIN permissions p ON p.id = rp.permission_id
ORDER BY r.name, p.resource, p.action;
