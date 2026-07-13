-- エラーログ管理テーブル作成スクリプト
-- 作成日：2026年7月13日
-- 目的：アプリケーション内エラーの集約管理（Issue #37）
--
-- ⚠️ affected_resource_id は stores 等への FK ではなく汎用 UUID とする。
-- stores テーブルは Issue #17（板垣担当・未完了）でまだ作成されていないため。

CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  stack_trace TEXT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  affected_resource_id UUID,
  status VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'resolved')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE error_logs IS 'アプリケーションエラーログ';
COMMENT ON COLUMN error_logs.error_type IS 'エラー種別';
COMMENT ON COLUMN error_logs.message IS 'エラーメッセージ';
COMMENT ON COLUMN error_logs.stack_trace IS 'スタックトレース';
COMMENT ON COLUMN error_logs.user_id IS 'エラー発生時のユーザ（不明な場合 NULL）';
COMMENT ON COLUMN error_logs.affected_resource_id IS '影響を受けたリソースID（store_id 等、FK なし）';
COMMENT ON COLUMN error_logs.status IS 'ステータス（new/reviewing/resolved）';

CREATE INDEX idx_error_logs_status ON error_logs(status);
CREATE INDEX idx_error_logs_created_at ON error_logs(created_at);

-- RLS: admin のみ全操作可能（TC_303_2 相当）
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY error_logs_admin_all ON error_logs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );
