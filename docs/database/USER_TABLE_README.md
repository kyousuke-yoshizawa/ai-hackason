# ユーザマスタテーブル（users）

## 概要

ユーザーの登録・認証情報を管理するマスタテーブルです。ログイン機能の実装に使用します。

## テーブル定義

### スキーマ

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| `id` | UUID | PRIMARY KEY | ユーザID（自動生成） |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE | メールアドレス（ログインID） |
| `name` | VARCHAR(255) | NOT NULL | ユーザ名 |
| `password` | VARCHAR(255) | NOT NULL | パスワード（ハッシュ化） |
| `role` | VARCHAR(50) | NOT NULL, DEFAULT 'user' | ユーザ権限（admin/user） |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | アクティブ状態 |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | 作成日時 |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | 更新日時 |

### インデックス

- `idx_users_email`：email カラムのインデックス（ログイン高速化）
- `idx_users_is_active`：is_active カラムのインデックス（アクティブユーザ絞込）

## テストデータ

初期データとして4人のメンバーを登録しています：

| メールアドレス | 名前 | 権限 |
|--------------|------|------|
| yoshizawa@ai-hackason.example | 吉沢 | admin |
| satoh@ai-hackason.example | 佐藤 | user |
| itagaki@ai-hackason.example | 板垣 | user |
| takayanagi@ai-hackason.example | 高柳 | user |

### パスワードについて

⚠️ **重要**：テストデータのパスワードは例示用です。実装時の注意点：

1. **ハッシュ化必須**：平文でのパスワード保存は絶対にしません
2. **推奨アルゴリズム**：bcrypt（推奨）、Argon2など
3. **ハッシュ化例**（Node.js）：
   ```javascript
   const bcrypt = require('bcrypt');
   const hashedPassword = await bcrypt.hash('password', 10);
   ```

4. **本番データの設定**：環境変数などで初期パスワードを管理

## 実装手順

### 1. Supabase でテーブル作成

以下の方法でテーブルを作成します：

**方法A：SQL エディタを使用**
- Supabase ダッシュボード → SQL Editor
- `001_create_users_table.sql` の内容をコピー＆ペースト
- 実行

**方法B：Migration ファイルを使用**
- `docs/database/001_create_users_table.sql` をマイグレーションとして実行

### 2. テストデータの確認

テーブル作成後、Supabase Table Editor で以下を確認：

```sql
SELECT id, email, name, role, is_active, created_at FROM users;
```

### 3. ログイン機能の実装

フロントエンドのログイン機能で以下を実装：

```javascript
// Supabase クライアント初期化
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ログイン処理
async function login(email, password) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single()
  
  if (error || !data) {
    return { success: false, message: 'ユーザが見つかりません' }
  }

  // パスワード検証（bcrypt など）
  const isValid = await bcrypt.compare(password, data.password)
  
  if (!isValid) {
    return { success: false, message: 'パスワードが正しくありません' }
  }

  return { success: true, user: data }
}
```

## セキュリティ考慮事項

### パスワード管理
- ✅ パスワードは必ずハッシュ化
- ✅ ハッシュ化時は Salt を使用
- ❌ 平文保存は絶対NG

### アクセス制御
- 吉沢：admin 権限（管理者機能へのアクセス可）
- その他：user 権限（通常機能のみ）

### Email の一意性
- UNIQUE 制約で重複登録を防止
- ログイン時に email で検索

## 今後の拡張

以下の機能追加を検討：

1. **パスワード変更**：updated_at の自動更新
2. **ログイン履歴**：別テーブルで記録
3. **2要素認証**：TOTP サポート
4. **プロフィール情報**：avatar, phone など
5. **ソーシャルログイン**：Google, GitHub との連携

---

**作成日**：2026年7月3日
**作成者**：吉沢
