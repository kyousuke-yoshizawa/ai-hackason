-- メール送信ログ管理テーブル作成スクリプト
-- 作成日：2026年7月13日
-- 目的：email_queue から送信されたメールの結果を記録（Issue #24）

-- テーブル作成
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID REFERENCES email_queue(id) ON DELETE SET NULL,
  recipient_email VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL,
  provider_message_id VARCHAR(255),
  error_message TEXT,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_email_logs_status CHECK (status IN ('sent', 'failed'))
);

-- インデックス作成（送信履歴の検索高速化）
CREATE INDEX idx_email_logs_queue_id ON email_logs(queue_id);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_created_at ON email_logs(created_at);

-- テーブルコメント
COMMENT ON TABLE email_logs IS 'メール送信結果（成功・失敗）の履歴ログ';
COMMENT ON COLUMN email_logs.id IS 'ログID（UUID）';
COMMENT ON COLUMN email_logs.queue_id IS '対応する email_queue のID';
COMMENT ON COLUMN email_logs.recipient_email IS '送信先メールアドレス';
COMMENT ON COLUMN email_logs.subject IS 'メール件名';
COMMENT ON COLUMN email_logs.status IS '送信結果（sent/failed）';
COMMENT ON COLUMN email_logs.provider_message_id IS 'SendGrid側のメッセージID';
COMMENT ON COLUMN email_logs.error_message IS '失敗時のエラーメッセージ';
COMMENT ON COLUMN email_logs.attempt_number IS '何回目の送信試行か';
COMMENT ON COLUMN email_logs.created_at IS '記録日時';
