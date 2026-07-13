# メール配信基盤テーブル（email_queue / email_logs）

## 概要

店舗責任者向けの混雑状態報告メールを SendGrid 経由で配信するための基盤テーブルです（Issue #24）。

- `email_queue`：送信待ち・送信中のメールを管理するキュー
- `email_logs`：送信結果（成功・失敗）の履歴ログ

## テーブル定義

### email_queue

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| `id` | UUID | PRIMARY KEY | キューID（自動生成） |
| `recipient_email` | VARCHAR(255) | NOT NULL | 送信先メールアドレス |
| `recipient_name` | VARCHAR(255) | | 送信先表示名 |
| `subject` | VARCHAR(255) | NOT NULL | メール件名 |
| `store_id` | UUID | | 対象店舗ID |
| `payload` | JSONB | NOT NULL, DEFAULT '{}' | テンプレートに渡すデータ（混雑状況など） |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'pending' | `pending` / `processing` / `sent` / `failed` |
| `retry_count` | INTEGER | NOT NULL, DEFAULT 0 | 再送信を試みた回数 |
| `max_retries` | INTEGER | NOT NULL, DEFAULT 3 | 再送信の最大試行回数 |
| `last_error` | TEXT | | 直近の送信失敗時のエラーメッセージ |
| `scheduled_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | 送信予定時刻 |
| `sent_at` | TIMESTAMP | | 送信完了時刻 |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | 作成日時 |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | 更新日時 |

### email_logs

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| `id` | UUID | PRIMARY KEY | ログID（自動生成） |
| `queue_id` | UUID | REFERENCES email_queue(id) | 対応するキューID |
| `recipient_email` | VARCHAR(255) | NOT NULL | 送信先メールアドレス |
| `subject` | VARCHAR(255) | NOT NULL | メール件名 |
| `status` | VARCHAR(20) | NOT NULL | `sent` / `failed` |
| `provider_message_id` | VARCHAR(255) | | SendGrid側のメッセージID |
| `error_message` | TEXT | | 失敗時のエラーメッセージ |
| `attempt_number` | INTEGER | NOT NULL, DEFAULT 1 | 何回目の送信試行か |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | 記録日時 |

## 送信フロー（リトライロジック）

1. `email_queue` に `status = 'pending'` でレコードを insert（enqueue）
2. 送信処理が `status = 'processing'` に更新して SendGrid API を呼び出す
3. **成功時**：`email_queue.status = 'sent'`、`sent_at` を記録し、`email_logs` に `status = 'sent'` で1件 insert
4. **失敗時**：`retry_count` を +1 し、
   - `retry_count < max_retries` の場合 → `status = 'pending'` に戻し再試行対象にする
   - `retry_count >= max_retries` の場合 → `status = 'failed'` で確定
   - いずれの場合も `email_logs` に `status = 'failed'` で1件 insert（`error_message` 記録）

## 実装手順

### 1. Supabase でテーブル作成

- Supabase ダッシュボード → SQL Editor
- `002_create_email_queue_table.sql` → `003_create_email_logs_table.sql` の順に実行

> ⚠️ **注意**：本番の Supabase スキーマを変更する場合は、CLAUDE.md の運用ルールに従い Kyosuke（インフラ担当）と事前に共有・調整してください。

### 2. 環境変数

`server/config/env.ts` が読み込む変数（`.env.example` 参照）：

```
SENDGRID_API_KEY=SG.xxxxx
EMAIL_FROM_ADDRESS=notify@ai-hackason.example
EMAIL_FROM_NAME=AI Hackathon 混雑通知
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

`SUPABASE_SERVICE_ROLE_KEY` はバックエンド専用（サーバー側のみで使用し、フロントエンドのビルド成果物に含めないこと）。

## 関連実装

- `server/services/emailQueueService.ts`：キューの insert / update / delete
- `server/services/emailLogService.ts`：ログの insert
- `server/services/sendGridClient.ts`：SendGrid 送信ラッパー
- `server/services/emailSenderService.ts`：キュー → 送信 → ログ記録 → リトライの一連フロー
- `server/services/emailTemplates.ts`：混雑状態報告メールの HTML テンプレート
