-- メール配信基盤：リトライ管理・送信ログ追加スクリプト
-- 作成日：2026年7月13日
-- 目的：Issue #24（混雑通知-メール配信基盤）の実装に必要な
--       リトライ管理カラムと送信ログテーブルを追加する。
--
-- ⚠️ 前提：002_create_new_features_schema.sql の email_notifications テーブルが
--    作成済みであること（さらにその email_notifications.store_id は stores テーブル
--    への FK のため、Issue #17 の stores テーブル作成が完了している必要がある）。

-- email_notifications にリトライ管理カラムを追加
ALTER TABLE email_notifications ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE email_notifications ADD COLUMN IF NOT EXISTS max_retries INTEGER NOT NULL DEFAULT 3;
ALTER TABLE email_notifications ADD COLUMN IF NOT EXISTS last_error TEXT;

COMMENT ON COLUMN email_notifications.retry_count IS '送信を再試行した回数';
COMMENT ON COLUMN email_notifications.max_retries IS '再送信の最大試行回数（超えたら配信対象から除外）';
COMMENT ON COLUMN email_notifications.last_error IS '直近の送信失敗時のエラーメッセージ';

-- 配信待ちレコードの検索を高速化（is_sent = false かつ scheduled_time 昇順で取得）
CREATE INDEX IF NOT EXISTS idx_email_notifications_pending
  ON email_notifications(scheduled_time)
  WHERE is_sent = false;

-- 送信ログテーブル作成
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

COMMENT ON TABLE email_send_logs IS 'email_notifications の送信結果（成功・失敗）の履歴ログ';
COMMENT ON COLUMN email_send_logs.notification_id IS '対応する email_notifications のID';
COMMENT ON COLUMN email_send_logs.recipient_email IS '送信先メールアドレス';
COMMENT ON COLUMN email_send_logs.status IS '送信結果（sent/failed）';
COMMENT ON COLUMN email_send_logs.provider_message_id IS 'SendGrid側のメッセージID';
COMMENT ON COLUMN email_send_logs.error_message IS '失敗時のエラーメッセージ';
COMMENT ON COLUMN email_send_logs.attempt_number IS '何回目の送信試行か';
