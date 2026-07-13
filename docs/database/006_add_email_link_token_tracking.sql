-- メールボタンリンク：トークン有効期限・使用済み管理カラム追加
-- 作成日：2026年7月13日
-- 目的：Issue #25（混雑通知-定期実行＆ボタンリンク）で使用する
--       1回限りトークン（有効期限30分）の検証に必要なカラムを追加する。
--
-- ⚠️ 前提：005_add_email_delivery_tracking.sql の実行が完了していること。

ALTER TABLE email_notifications ADD COLUMN IF NOT EXISTS link_token_expires_at TIMESTAMP;
ALTER TABLE email_notifications ADD COLUMN IF NOT EXISTS link_used_at TIMESTAMP;

COMMENT ON COLUMN email_notifications.link_token_expires_at IS 'link_token の有効期限（生成から30分）';
COMMENT ON COLUMN email_notifications.link_used_at IS 'ボタンリンクが使用された時刻（1回限り、再利用防止）';

CREATE INDEX IF NOT EXISTS idx_email_notifications_link_token ON email_notifications(link_token)
  WHERE link_token IS NOT NULL;
