-- 未作成テーブルの作成 + 全空テーブルへのテストデータ投入
-- 作成日：2026年7月15日
-- 目的：docs/database/ 配下のマイグレーション（002_create_new_features_schema.sql,
--       002_create_likes_reviews_tables.sql, 004〜007）がこのSupabaseプロジェクトに
--       未適用だったため、実アプリコード（api/ 配下・src/lib 配下）の実際のカラム
--       利用状況に合わせて改めて作成し、動作確認用のテストデータを投入する。
--
-- ⚠️ 元の 002_create_new_features_schema.sql は user_id/created_by/manager_id 等を
--    auth.users(id) 参照で定義していたが、本アプリは Supabase Auth を使わず
--    public.users テーブル + localStorage の独自認証のため、本ファイルでは
--    それらの FK を users(id) に修正している（実コードの参照先も users テーブル）。
--
-- 実行方法：Supabase ダッシュボード > SQL Editor に貼り付けて実行してください（1回のみ実行想定）。
-- べき等性：CREATE TABLE 文と、一意制約を持つテーブルへの INSERT は
--          IF NOT EXISTS / ON CONFLICT DO NOTHING で再実行してもエラー・重複になりません。
--          ただし reservations / store_media / error_logs / reviews / crowd_history /
--          email_send_logs への INSERT は一意制約を持たない自由入力データのため、
--          再実行すると行が重複します（複数回実行しないでください）。

-- ============================================================
-- 0. 既存テーブル（roles / permissions / role_permissions）
--    テーブル自体は作成済み・0件だったため、正規のシード投入のみ行う
--    （docs/database/002_create_rbac_tables.sql と同一内容）
-- ============================================================

INSERT INTO roles (name, description) VALUES
  ('admin', '管理者：全リソースへのフルアクセス'),
  ('store_manager', '店舗責任者：自店舗のデータ管理'),
  ('user', '一般ユーザ：閲覧中心のアクセス')
ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions (resource, action) VALUES
  ('users', 'read'), ('users', 'create'), ('users', 'update'), ('users', 'delete'),
  ('stores', 'read'), ('stores', 'create'), ('stores', 'update'), ('stores', 'delete'),
  ('crowd', 'read'), ('crowd', 'create'), ('crowd', 'update'), ('crowd', 'delete')
ON CONFLICT (resource, action) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p
  ON (p.resource = 'users' AND p.action = 'read')
  OR (p.resource = 'stores' AND p.action IN ('read', 'update'))
  OR (p.resource = 'crowd' AND p.action IN ('read', 'create'))
WHERE r.name = 'store_manager'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.action = 'read'
WHERE r.name = 'user'
ON CONFLICT DO NOTHING;

-- ============================================================
-- 1. stores（既存テーブル・0件だったのでテストデータのみ投入）
--    固定UUIDを使うことで、以降のテーブルから確実に参照できるようにする
-- ============================================================

INSERT INTO stores (id, name, category, x, y, open_time, close_time, price_min, price_max, created_by)
SELECT '10000000-0000-4000-8000-000000000001', 'ことこと食堂', 'restaurant', 50.00, 60.00, '11:00', '21:00', 800, 1500, u.id
FROM users u WHERE u.email = 'yoshizawa@ai-hackason.example'
ON CONFLICT (id) DO NOTHING;

INSERT INTO stores (id, name, category, x, y, open_time, close_time, price_min, price_max, created_by)
SELECT '10000000-0000-4000-8000-000000000002', 'ことこと珈琲', 'cafe', 120.50, 80.25, '08:00', '19:00', 400, 900, u.id
FROM users u WHERE u.email = 'yoshizawa@ai-hackason.example'
ON CONFLICT (id) DO NOTHING;

INSERT INTO stores (id, name, category, x, y, open_time, close_time, price_min, price_max, created_by)
SELECT '10000000-0000-4000-8000-000000000003', 'ことこと雑貨店', 'goods', 200.00, 150.75, '10:00', '20:00', 300, 5000, u.id
FROM users u WHERE u.email = 'yoshizawa@ai-hackason.example'
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. user_roles（Issue #20）
-- ============================================================
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_store_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

INSERT INTO user_roles (user_id, role_id, assigned_store_ids)
SELECT u.id, r.id, '{}'
FROM users u JOIN roles r ON r.name = CASE WHEN u.role = 'admin' THEN 'admin' ELSE 'user' END
ON CONFLICT (user_id, role_id) DO NOTHING;

-- ============================================================
-- 3. store_managers（Issue #17）
-- ============================================================
CREATE TABLE IF NOT EXISTS store_managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(store_id, manager_id)
);

-- テスト用：itagaki を店舗1の、satoh を店舗2の担当者として割り当て
INSERT INTO store_managers (store_id, manager_id)
SELECT '10000000-0000-4000-8000-000000000001', u.id FROM users u WHERE u.email = 'itagaki@ai-hackason.example'
ON CONFLICT (store_id, manager_id) DO NOTHING;

INSERT INTO store_managers (store_id, manager_id)
SELECT '10000000-0000-4000-8000-000000000002', u.id FROM users u WHERE u.email = 'satoh@ai-hackason.example'
ON CONFLICT (store_id, manager_id) DO NOTHING;

-- ============================================================
-- 4. crowd_status（Issue #24, #26）
-- ============================================================
CREATE TABLE IF NOT EXISTS crowd_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  level TEXT NOT NULL CHECK (level IN ('low', 'medium', 'high')),
  updated_by UUID NOT NULL REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(store_id)
);

ALTER TABLE crowd_status ENABLE ROW LEVEL SECURITY;

-- 元の 002_create_new_features_schema.sql と同じポリシー定義を維持。
-- ⚠️ 003_rls_policies.sql に記載の既知の制約のとおり、本アプリは Supabase Auth を
-- 使わないため auth.role()/auth.uid() は現状 NULL のままで、このポリシーは
-- Supabase Auth 移行後でないと機能しない（サーバ側は service role key で処理）。
CREATE POLICY crowd_status_select ON crowd_status
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY crowd_status_update ON crowd_status
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND (r.name = 'admin' OR r.name = 'store_manager')
      AND (r.name = 'admin' OR store_id = ANY(ur.assigned_store_ids::uuid[]))
    )
  );

INSERT INTO crowd_status (store_id, level, updated_by)
SELECT '10000000-0000-4000-8000-000000000001', 'medium', u.id FROM users u WHERE u.email = 'itagaki@ai-hackason.example'
ON CONFLICT (store_id) DO NOTHING;

INSERT INTO crowd_status (store_id, level, updated_by)
SELECT '10000000-0000-4000-8000-000000000002', 'low', u.id FROM users u WHERE u.email = 'satoh@ai-hackason.example'
ON CONFLICT (store_id) DO NOTHING;

INSERT INTO crowd_status (store_id, level, updated_by)
SELECT '10000000-0000-4000-8000-000000000003', 'high', u.id FROM users u WHERE u.email = 'yoshizawa@ai-hackason.example'
ON CONFLICT (store_id) DO NOTHING;

-- ============================================================
-- 5. crowd_history（Issue #24）
-- ============================================================
CREATE TABLE IF NOT EXISTS crowd_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  level TEXT NOT NULL,
  recorded_at TIMESTAMP DEFAULT NOW(),
  recorded_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_crowd_history_store ON crowd_history(store_id, recorded_at DESC);

ALTER TABLE crowd_history ENABLE ROW LEVEL SECURITY;

INSERT INTO crowd_history (store_id, level, recorded_at, recorded_by)
SELECT '10000000-0000-4000-8000-000000000001', lvl, NOW() - make_interval(hours => offset_h), u.id
FROM users u,
  (VALUES ('low', 6), ('medium', 3), ('medium', 1)) AS t(lvl, offset_h)
WHERE u.email = 'itagaki@ai-hackason.example';

INSERT INTO crowd_history (store_id, level, recorded_at, recorded_by)
SELECT '10000000-0000-4000-8000-000000000002', lvl, NOW() - make_interval(hours => offset_h), u.id
FROM users u,
  (VALUES ('low', 5), ('low', 2)) AS t(lvl, offset_h)
WHERE u.email = 'satoh@ai-hackason.example';

-- ============================================================
-- 6. email_notifications（Issue #24, #25）+ リトライ/トークン管理カラム（005, 006）
-- ============================================================
CREATE TABLE IF NOT EXISTS email_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES users(id),
  notification_type TEXT DEFAULT 'crowd_update',
  scheduled_time TIMESTAMP NOT NULL,
  sent_at TIMESTAMP,
  link_token TEXT UNIQUE,
  is_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  last_error TEXT,
  link_token_expires_at TIMESTAMP,
  link_used_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_notifications_pending
  ON email_notifications(scheduled_time)
  WHERE is_sent = false;

CREATE INDEX IF NOT EXISTS idx_email_notifications_link_token ON email_notifications(link_token)
  WHERE link_token IS NOT NULL;

ALTER TABLE email_notifications ENABLE ROW LEVEL SECURITY;

INSERT INTO email_notifications (id, store_id, manager_id, notification_type, scheduled_time, is_sent, link_token, link_token_expires_at)
SELECT '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', u.id,
       'crowd_update', NOW() + interval '30 minutes', false, 'test-link-token-0001', NOW() + interval '60 minutes'
FROM users u WHERE u.email = 'itagaki@ai-hackason.example'
ON CONFLICT (id) DO NOTHING;

INSERT INTO email_notifications (id, store_id, manager_id, notification_type, scheduled_time, is_sent, sent_at, link_token, link_used_at)
SELECT '20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', u.id,
       'crowd_update', NOW() - interval '2 hours', true, NOW() - interval '2 hours', 'test-link-token-0002', NOW() - interval '110 minutes'
FROM users u WHERE u.email = 'satoh@ai-hackason.example'
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 7. email_send_logs（005）
-- ============================================================
CREATE TABLE IF NOT EXISTS email_send_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES email_notifications(id) ON DELETE SET NULL,
  recipient_email VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL,
  provider_message_id VARCHAR(255),
  error_message TEXT,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_email_send_logs_status CHECK (status IN ('sent', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_email_send_logs_notification_id ON email_send_logs(notification_id);
CREATE INDEX IF NOT EXISTS idx_email_send_logs_status ON email_send_logs(status);

INSERT INTO email_send_logs (notification_id, recipient_email, status, provider_message_id, attempt_number)
VALUES ('20000000-0000-4000-8000-000000000002', 'satoh@ai-hackason.example', 'sent', 'test-provider-msg-0001', 1);

-- ============================================================
-- 8. crowd_analytics（Issue #31）
-- ============================================================
CREATE TABLE IF NOT EXISTS crowd_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  date_period DATE NOT NULL,
  level_distribution JSONB DEFAULT '{"low": 0, "medium": 0, "high": 0}',
  peak_hour INTEGER,
  peak_level TEXT,
  total_updates INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(store_id, date_period)
);

CREATE INDEX IF NOT EXISTS idx_crowd_analytics_store ON crowd_analytics(store_id, date_period DESC);

ALTER TABLE crowd_analytics ENABLE ROW LEVEL SECURITY;

INSERT INTO crowd_analytics (store_id, date_period, level_distribution, peak_hour, peak_level, total_updates)
VALUES
  ('10000000-0000-4000-8000-000000000001', CURRENT_DATE, '{"low": 2, "medium": 5, "high": 1}', 18, 'medium', 8),
  ('10000000-0000-4000-8000-000000000002', CURRENT_DATE, '{"low": 6, "medium": 1, "high": 0}', 9, 'low', 7)
ON CONFLICT (store_id, date_period) DO NOTHING;

-- ============================================================
-- 9. reservations（Issue #33）
-- ============================================================
CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reservation_date DATE NOT NULL,
  reservation_time TIME,
  party_size INTEGER NOT NULL CHECK (party_size > 0 AND party_size <= 20),
  special_requests TEXT,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  payment_method TEXT DEFAULT 'on-site' CHECK (payment_method = 'on-site'),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reservations_store ON reservations(store_id, reservation_date);
CREATE INDEX IF NOT EXISTS idx_reservations_user ON reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);

ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- 元の 002_create_new_features_schema.sql と同じポリシー定義を維持（同上の既知の制約あり）
CREATE POLICY reservations_select ON reservations
  FOR SELECT USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND store_id = ANY(ur.assigned_store_ids::uuid[])
    )
  );

CREATE POLICY reservations_insert ON reservations
  FOR INSERT WITH CHECK (user_id = auth.uid());

INSERT INTO reservations (store_id, user_id, reservation_date, reservation_time, party_size, status)
SELECT '10000000-0000-4000-8000-000000000001', u.id, CURRENT_DATE + 1, '19:00', 4, 'confirmed'
FROM users u WHERE u.email = 'satoh@ai-hackason.example';

INSERT INTO reservations (store_id, user_id, reservation_date, reservation_time, party_size, status)
SELECT '10000000-0000-4000-8000-000000000002', u.id, CURRENT_DATE + 2, '09:30', 2, 'pending'
FROM users u WHERE u.email = 'takayanagi@ai-hackason.example';

-- ============================================================
-- 10. store_media（Issue #35, #36）
-- ============================================================
CREATE TABLE IF NOT EXISTS store_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'document')),
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_media_store ON store_media(store_id);

ALTER TABLE store_media ENABLE ROW LEVEL SECURITY;

-- 元の 002_create_new_features_schema.sql と同じポリシー定義を維持（同上の既知の制約あり）
CREATE POLICY store_media_select ON store_media
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM stores s
      WHERE s.id = store_media.store_id
      AND (
        s.created_by = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM user_roles ur
          WHERE ur.user_id = auth.uid()
          AND store_media.store_id = ANY(ur.assigned_store_ids::uuid[])
        )
      )
    )
  );

INSERT INTO store_media (store_id, media_type, file_path, file_name, file_size, mime_type, created_by)
SELECT '10000000-0000-4000-8000-000000000001', 'image', 'store-media/test/kotokoto-shokudo-1.jpg', 'kotokoto-shokudo-1.jpg', 204800, 'image/jpeg', u.id
FROM users u WHERE u.email = 'itagaki@ai-hackason.example';

-- ============================================================
-- 11. error_logs（Issue #37, #38）
--     004_create_error_logs_table.sql の基本カラム + 実コードが参照する
--     resolution_notes / resolved_by / resolved_at を追加したもの
-- ============================================================
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  stack_trace TEXT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  affected_resource_id UUID,
  status VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'resolved')),
  resolution_notes TEXT,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_error_logs_status ON error_logs(status);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at);

ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- 元の 004_create_error_logs_table.sql と同じポリシー定義を維持（admin のみ・同上の既知の制約あり）
CREATE POLICY error_logs_admin_all ON error_logs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

INSERT INTO error_logs (error_type, message, stack_trace, user_id, affected_resource_id, status)
SELECT 'TypeError', 'テスト用エラー：Cannot read properties of undefined', 'at test.ts:1:1', u.id, '10000000-0000-4000-8000-000000000001', 'new'
FROM users u WHERE u.email = 'satoh@ai-hackason.example';

INSERT INTO error_logs (error_type, message, stack_trace, user_id, affected_resource_id, status, resolution_notes, resolved_by, resolved_at)
SELECT 'NetworkError', 'テスト用エラー：Supabase接続タイムアウト', 'at supabase.ts:42:10', u1.id, '10000000-0000-4000-8000-000000000002', 'resolved', 'リトライ処理で解消済み', u2.id, NOW() - interval '1 day'
FROM users u1, users u2
WHERE u1.email = 'takayanagi@ai-hackason.example' AND u2.email = 'yoshizawa@ai-hackason.example';

-- ============================================================
-- 12. likes（Issue #27, #28）
-- ============================================================
CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, store_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_store_id ON likes(store_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);

INSERT INTO likes (user_id, store_id)
SELECT u.id, '10000000-0000-4000-8000-000000000001' FROM users u WHERE u.email = 'itagaki@ai-hackason.example'
ON CONFLICT (user_id, store_id) DO NOTHING;

INSERT INTO likes (user_id, store_id)
SELECT u.id, '10000000-0000-4000-8000-000000000002' FROM users u WHERE u.email = 'satoh@ai-hackason.example'
ON CONFLICT (user_id, store_id) DO NOTHING;

INSERT INTO likes (user_id, store_id)
SELECT u.id, '10000000-0000-4000-8000-000000000003' FROM users u WHERE u.email = 'takayanagi@ai-hackason.example'
ON CONFLICT (user_id, store_id) DO NOTHING;

-- ============================================================
-- 13. reviews + review_stats（Issue #29, #30）
--     review_stats はトリガーにより reviews の INSERT 時に自動集計される
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment VARCHAR(500),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_store_id ON reviews(store_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);

CREATE TABLE IF NOT EXISTS review_stats (
  store_id UUID PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
  avg_rating NUMERIC(3, 2) NOT NULL DEFAULT 0,
  review_count INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION refresh_review_stats() RETURNS TRIGGER AS $$
DECLARE
  target_store_id UUID;
BEGIN
  target_store_id := COALESCE(NEW.store_id, OLD.store_id);

  INSERT INTO review_stats (store_id, avg_rating, review_count, last_updated)
  SELECT
    target_store_id,
    COALESCE(AVG(rating), 0),
    COUNT(*),
    NOW()
  FROM reviews
  WHERE store_id = target_store_id
  ON CONFLICT (store_id) DO UPDATE SET
    avg_rating = EXCLUDED.avg_rating,
    review_count = EXCLUDED.review_count,
    last_updated = EXCLUDED.last_updated;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reviews_stats_insert ON reviews;
CREATE TRIGGER trg_reviews_stats_insert
AFTER INSERT ON reviews
FOR EACH ROW EXECUTE FUNCTION refresh_review_stats();

DROP TRIGGER IF EXISTS trg_reviews_stats_update ON reviews;
CREATE TRIGGER trg_reviews_stats_update
AFTER UPDATE ON reviews
FOR EACH ROW EXECUTE FUNCTION refresh_review_stats();

DROP TRIGGER IF EXISTS trg_reviews_stats_delete ON reviews;
CREATE TRIGGER trg_reviews_stats_delete
AFTER DELETE ON reviews
FOR EACH ROW EXECUTE FUNCTION refresh_review_stats();

-- テストレビュー投入（トリガーで review_stats が自動生成される）
INSERT INTO reviews (user_id, store_id, rating, comment)
SELECT u.id, '10000000-0000-4000-8000-000000000001', 5, 'テストレビュー：とても美味しかったです！'
FROM users u WHERE u.email = 'satoh@ai-hackason.example';

INSERT INTO reviews (user_id, store_id, rating, comment)
SELECT u.id, '10000000-0000-4000-8000-000000000001', 4, 'テストレビュー：雰囲気が良かったです'
FROM users u WHERE u.email = 'takayanagi@ai-hackason.example';

INSERT INTO reviews (user_id, store_id, rating, comment)
SELECT u.id, '10000000-0000-4000-8000-000000000002', 3, 'テストレビュー：普通でした'
FROM users u WHERE u.email = 'itagaki@ai-hackason.example';

-- ============================================================
-- 14. crowd_patterns（Issue #26 フォールバック用、007）
-- ============================================================
CREATE TABLE IF NOT EXISTS crowd_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  hour_of_day INTEGER NOT NULL CHECK (hour_of_day BETWEEN 0 AND 23),
  level TEXT NOT NULL CHECK (level IN ('low', 'medium', 'high')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, hour_of_day)
);

CREATE INDEX IF NOT EXISTS idx_crowd_patterns_store_hour ON crowd_patterns(store_id, hour_of_day);

INSERT INTO crowd_patterns (store_id, hour_of_day, level) VALUES
  ('10000000-0000-4000-8000-000000000001', 12, 'high'),
  ('10000000-0000-4000-8000-000000000001', 18, 'high'),
  ('10000000-0000-4000-8000-000000000001', 15, 'low'),
  ('10000000-0000-4000-8000-000000000002', 9, 'medium'),
  ('10000000-0000-4000-8000-000000000002', 14, 'low')
ON CONFLICT (store_id, hour_of_day) DO NOTHING;

-- ============================================================
-- 動作確認用クエリ
-- ============================================================
-- SELECT 'stores' t, count(*) FROM stores
-- UNION ALL SELECT 'roles', count(*) FROM roles
-- UNION ALL SELECT 'permissions', count(*) FROM permissions
-- UNION ALL SELECT 'role_permissions', count(*) FROM role_permissions
-- UNION ALL SELECT 'user_roles', count(*) FROM user_roles
-- UNION ALL SELECT 'store_managers', count(*) FROM store_managers
-- UNION ALL SELECT 'crowd_status', count(*) FROM crowd_status
-- UNION ALL SELECT 'crowd_history', count(*) FROM crowd_history
-- UNION ALL SELECT 'email_notifications', count(*) FROM email_notifications
-- UNION ALL SELECT 'email_send_logs', count(*) FROM email_send_logs
-- UNION ALL SELECT 'crowd_analytics', count(*) FROM crowd_analytics
-- UNION ALL SELECT 'reservations', count(*) FROM reservations
-- UNION ALL SELECT 'store_media', count(*) FROM store_media
-- UNION ALL SELECT 'error_logs', count(*) FROM error_logs
-- UNION ALL SELECT 'likes', count(*) FROM likes
-- UNION ALL SELECT 'reviews', count(*) FROM reviews
-- UNION ALL SELECT 'review_stats', count(*) FROM review_stats
-- UNION ALL SELECT 'crowd_patterns', count(*) FROM crowd_patterns;
