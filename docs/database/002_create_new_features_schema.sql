-- Migration: Create new features schema for expanded Kotokoto Town app
-- Phase 1: High Priority Features (MVP)
-- Phase 2: Medium Priority Features
-- Phase 3: Low Priority Features

-- ========================================
-- PHASE 1: HIGH PRIORITY (MVP)
-- ========================================

-- Issue #20: RBAC Schema
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO roles (name, description) VALUES
  ('admin', 'Full system access'),
  ('store_manager', 'Can manage assigned stores and crowd status'),
  ('user', 'Regular user, can like, review, and make reservations');

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_store_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, role_id)
);

-- Issue #17: Store Schema Extension
ALTER TABLE stores ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE stores ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

CREATE TABLE store_managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(store_id, manager_id)
);

-- Issue #23: Map Coordinate Management (x_coord, y_coord already in stores)
-- Adding indexes for efficient geographic queries
CREATE INDEX IF NOT EXISTS idx_stores_coordinates ON stores(x_coord, y_coord);

-- Issue #24 & #25: Crowd Status & Email Notification
CREATE TABLE crowd_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  level TEXT NOT NULL CHECK (level IN ('low', 'medium', 'high')),
  updated_by UUID NOT NULL REFERENCES auth.users(id),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(store_id)
);

CREATE TABLE crowd_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  level TEXT NOT NULL,
  recorded_at TIMESTAMP DEFAULT NOW(),
  recorded_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_crowd_history_store ON crowd_history(store_id, recorded_at DESC);

CREATE TABLE email_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES auth.users(id),
  notification_type TEXT DEFAULT 'crowd_update',
  scheduled_time TIMESTAMP NOT NULL,
  sent_at TIMESTAMP,
  link_token TEXT UNIQUE,
  is_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_notifications_scheduled ON email_notifications(scheduled_time)
WHERE is_sent = false;

-- Issue #26: Real-time Crowd Display
-- Uses crowd_status table with RLS for real-time subscriptions

-- ========================================
-- PHASE 2: MEDIUM PRIORITY
-- ========================================

-- Issue #27 & #29: Likes / Reviews Feature
-- ⚠️ likes / reviews / review_stats はこのファイルでは定義しない。
-- 実際にフロントエンド（src/lib/likes.ts, src/lib/reviews.ts）から使われている
-- 正式なスキーマは docs/database/002_create_likes_reviews_tables.sql を参照。
-- （このファイルの旧定義は auth.users を前提としていたが、本アプリの実際の認証は
--   public.users テーブル + localStorage によるカスタム実装のため不整合だった）

-- Issue #31: Crowd Analytics
CREATE TABLE crowd_analytics (
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

-- Issue #33: Reservations Feature
CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- ========================================
-- PHASE 3: LOW PRIORITY
-- ========================================

-- Issue #35 & #36: Store Media Attachment
CREATE TABLE store_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'document')),
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_media_store ON store_media(store_id);

-- Issue #37 & #38: Error Management
CREATE TABLE error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  user_id UUID REFERENCES auth.users(id),
  affected_resource_type TEXT,
  affected_resource_id TEXT,
  http_status INTEGER,
  request_path TEXT,
  request_method TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'resolved')),
  resolution_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_error_logs_status ON error_logs(status);
CREATE INDEX IF NOT EXISTS idx_error_logs_created ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_resource ON error_logs(affected_resource_type, affected_resource_id);

-- ========================================
-- RLS (Row Level Security) Policies
-- ========================================

-- Enable RLS on all new tables
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE crowd_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE crowd_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE crowd_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Crowd Status RLS: All authenticated users can read, only managers can update
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

-- Reservations RLS: Users see own, managers see their stores
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

-- Error Logs RLS: Admin only
CREATE POLICY error_logs_select ON error_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
    )
  );

CREATE POLICY error_logs_insert ON error_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Media RLS: Managers of store can view, admins can delete
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

-- ========================================
-- Indexes for Performance
-- ========================================

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
