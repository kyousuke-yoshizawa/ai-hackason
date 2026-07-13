-- メールキュー管理テーブル作成スクリプト
-- 作成日：2026年7月13日
-- 目的：店舗混雑状態報告メールの送信待ちキューを管理（Issue #24）

-- テーブル作成
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(255),
  subject VARCHAR(255) NOT NULL,
  store_id UUID,
  payload JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  last_error TEXT,
  scheduled_at TIMESTAMP NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_email_queue_status CHECK (status IN ('pending', 'processing', 'sent', 'failed'))
);

-- インデックス作成（キュー処理のポーリング高速化）
CREATE INDEX idx_email_queue_status ON email_queue(status);
CREATE INDEX idx_email_queue_scheduled_at ON email_queue(scheduled_at);

-- テーブルコメント
COMMENT ON TABLE email_queue IS '店舗混雑状態報告メールの送信待ちキュー';
COMMENT ON COLUMN email_queue.id IS 'キューID（UUID）';
COMMENT ON COLUMN email_queue.recipient_email IS '送信先メールアドレス';
COMMENT ON COLUMN email_queue.recipient_name IS '送信先表示名';
COMMENT ON COLUMN email_queue.subject IS 'メール件名';
COMMENT ON COLUMN email_queue.store_id IS '対象店舗ID';
COMMENT ON COLUMN email_queue.payload IS 'テンプレートに渡すデータ（混雑状況など）';
COMMENT ON COLUMN email_queue.status IS 'キュー状態（pending/processing/sent/failed）';
COMMENT ON COLUMN email_queue.retry_count IS '再送信を試みた回数';
COMMENT ON COLUMN email_queue.max_retries IS '再送信の最大試行回数';
COMMENT ON COLUMN email_queue.last_error IS '直近の送信失敗時のエラーメッセージ';
COMMENT ON COLUMN email_queue.scheduled_at IS '送信予定時刻';
COMMENT ON COLUMN email_queue.sent_at IS '送信完了時刻';
COMMENT ON COLUMN email_queue.created_at IS '作成日時';
COMMENT ON COLUMN email_queue.updated_at IS '更新日時';
