# Backend Subagent - バック実装ガイド（AI向け）

対象: バック担当者、またはバックエンド実装を依頼されたAIエージェント

---

## 1. 技術スタック

- Node.js 18 + Express
- Claude API（Anthropic）
- Supabase（PostgreSQL）をDBとして利用

## 2. ディレクトリ構成（推奨）

```
server/
├─ routes/           # エンドポイント定義
├─ services/         # ビジネスロジック（Claude API呼び出し等）
├─ lib/
│  └─ supabase.ts    # Supabase（service_role）クライアント
├─ middleware/        # 認証・エラーハンドリング等
└─ index.ts           # エントリポイント
```

## 3. Supabase（サーバー側）の初期化例

```typescript
// server/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // サーバーサイドのみで使用
)
```

## 4. Claude API呼び出しの基本パターン

```typescript
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': process.env.ANTHROPIC_API_KEY!,
    'anthropic-version': '2023-06-01',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    messages: [{ role: 'user', content: userPrompt }],
  }),
})
const data = await response.json()
```

> 最新のモデル名・仕様は、実装前に `product-self-knowledge` に類する社内情報や
> Anthropic公式ドキュメント（docs.claude.com）で確認すること。

## 5. エラーハンドリングの基本方針

```typescript
app.post('/api/messages', async (req, res) => {
  try {
    // 処理
    res.json({ success: true, data: result })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: 'internal_error' })
  }
})
```

- エラーの詳細（スタックトレース等）をレスポンスにそのまま返さない（セキュリティ）
- ログには出力してデバッグしやすくする

## 6. 環境変数管理

- ローカル（Codespaces）では `.env`（`.gitignore` 対象）を使用
- 本番（Vercel）はVercelの環境変数設定を使用
- 使う変数は `server/lib/env.ts` 等に一箇所にまとめ、`process.env` を各所に直書きしない

## 7. セキュリティチェックリスト

- [ ] `service_role` キーをフロントに渡していない
- [ ] 入力値のバリデーション（最低限、必須項目の存在チェック）を行っている
- [ ] SQLインジェクション対策（Supabase SDK経由のクエリなら基本的に安全だが、生SQL使用時は要注意）
- [ ] CORS設定が必要以上に緩くなっていない

## 8. PR作成前のセルフチェック

- [ ] ローカルで全エンドポイントの疎通確認済み
- [ ] `.env` がコミットに含まれていない（`git status` で確認）
- [ ] エラー時に適切なステータスコードを返している
