# Supabase & Vercel APIキー取得・セットアップガイド

対象: Kyosuke（リーダー、インフラ担当）

このドキュメントは詳細版です。実行手順の要約は `setup-guide-github-to-secrets.md` も参照してください。

---

## 1. Supabase

### 1-1. プロジェクト作成

1. https://supabase.com にログイン → 「New project」
2. Organization / Name: `ai-hackathon`
3. Database Password: 強力なものを生成し、パスワードマネージャに保存
4. Region: `Northeast Asia (Tokyo)`
5. Pricing Plan: `Free` で問題なし（ハッカソン規模のため）

### 1-2. APIキーの場所

`Project Settings` → `API`

| 表示名 | 用途 | Secret名 |
|---|---|---|
| Project URL | 接続先URL | `SUPABASE_URL` |
| anon public | フロントエンドから使う公開キー（RLS前提） | `SUPABASE_ANON_KEY` |
| service_role | バックエンドのみで使う管理者キー | `SUPABASE_SERVICE_ROLE_KEY` |

> **重要:** `service_role` キーは絶対にフロントエンドのコードやビルド成果物に含めないこと。
> RLS（Row Level Security）をバイパスできる強力な権限を持ちます。

### 1-3. Row Level Security（RLS）の初期設定

ハッカソンで時間がない場合でも、最低限以下は設定推奨:

```sql
-- 例: messagesテーブルの場合
alter table messages enable row level security;

create policy "認証済みユーザーは読み書き可能"
on messages for all
using (auth.role() = 'authenticated');
```

### 1-4. 接続テスト

```bash
curl "<SUPABASE_URL>/rest/v1/" \
  -H "apikey: <SUPABASE_ANON_KEY>"
```

---

## 2. Vercel

### 2-1. プロジェクト作成とGitHub連携

1. https://vercel.com → 「Add New」→「Project」
2. 「Import Git Repository」から `ai-hackathon` を選択
3. Framework Preset: `Vite`
4. Build Command / Output Directory はViteのデフォルトのままでOK（`npm run build` / `dist`）

### 2-2. 環境変数

`Settings` → `Environment Variables` に以下を登録（全environment）:

| Key | 値 |
|---|---|
| `VITE_SUPABASE_URL` | 上記 `SUPABASE_URL` |
| `VITE_SUPABASE_ANON_KEY` | 上記 `SUPABASE_ANON_KEY` |
| `ANTHROPIC_API_KEY` | バックエンドのServerless Functionsで使う場合のみ（フロント直呼びは避ける） |

### 2-3. CI/CD用トークンの取得

1. Vercelアカウント設定 → `Tokens` → 「Create」
2. 名前: `ai-hackathon-ci`
3. 発行されたトークンを `VERCEL_TOKEN` としてGitHub Secretsに登録
4. `Project ID`（プロジェクト設定内）を `VERCEL_PROJECT_ID` として登録
5. `Team ID` / `Org ID`（個人アカウントの場合はユーザーIDに相当）を `VERCEL_ORG_ID` として登録

### 2-4. Preview Deploy の活用

PRを作成するたびにVercelが自動でPreview環境を作成します。
PRのコメント欄に表示されるURLをレビュー時に必ず開いて動作確認してください。

---

## 3. 両方の接続確認チェックリスト

- [ ] Supabaseのテーブルが作成されており、curlで疎通確認できる
- [ ] VercelのビルドがGreen（成功）で、Preview URLが開ける
- [ ] Preview環境からSupabaseへの接続が実際に成功している（コンソールエラーがない）
- [ ] `service_role` キーがフロントのバンドルに含まれていないことを確認（ビルド成果物をgrepして確認可能）

```bash
grep -r "service_role" dist/ || echo "OK: service_roleキーの混入なし"
```
