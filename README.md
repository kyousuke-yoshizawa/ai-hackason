# AI Hackathon 2026

4人チーム（Kyosuke + 3名）で20時間かけて動く本番アプリケーションを作るハッカソンプロジェクトです。

## 🚀 まずやること

開発に参加する人は、まず以下を読んでください（全体で約1.5時間）。

1. [`docs/ai-hackathon-team-ops/README.md`](docs/ai-hackathon-team-ops/README.md) — セットアップ・使い方ガイド
2. [`docs/ai-hackathon-team-ops/SKILL.md`](docs/ai-hackathon-team-ops/SKILL.md) — プロジェクト全体像
3. [`docs/ai-hackathon-team-ops/references/ai-harness-core.md`](docs/ai-hackathon-team-ops/references/ai-harness-core.md) — AIエージェントに実装を頼む人は必読
4. `docs/ai-hackathon-team-ops/agents/` 配下の自分の役割のファイル（フロント/バック/インフラ/QA）

開発開始直前には [`checklists/pre-launch.md`](docs/ai-hackathon-team-ops/checklists/pre-launch.md) で最終確認します。

## 🧑‍🤝‍🧑 チーム

| 役割 | 担当 |
|---|---|
| インフラ・ハーネスリード | Kyosuke |
| フロントエンド | フロント担当 |
| バックエンド | バック担当 |
| QA | QA担当 |

## 🛠️ 技術スタック

- **フロントエンド:** React 18 + TypeScript + Tailwind CSS + Vite
- **バックエンド:** Node.js + Express（`server/`）+ Vercel Functions（`api/`）
- **AI:** Claude API（`@anthropic-ai/sdk`）によるお出かけプラン生成。`POST /api/plan/generate`（`backend/domains/plan/`）で意図解析・店舗照合・スコアリング・プラン生成をAPI呼び出し1回に統合。UI画面は別タスクで実装予定
- **データベース:** Supabase (PostgreSQL)
- **デプロイ:** Vercel（自動デプロイ）
- **ドキュメント:** Notion Database（PRマージ時に自動同期）
- **開発環境:** Ubuntu (WSL2) + Claude CLI

## ⚙️ 環境変数セットアップガイド

### 🚀 高速セットアップ（推奨）

#### 1️⃣ Vercel Marketplace から Supabase 統合をインストール

1. [Vercel ダッシュボード](https://vercel.com) → **Integrations** → **Supabase** を検索
2. **Install** をクリック
3. Supabase プロジェクトを選択
4. Vercel プロジェクトをリンク

✅ これで以下の環境変数が **Vercel に自動設定**されます：
- `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

#### 2️⃣ npm run setup で残りを自動セットアップ

```bash
# 依存関係をインストール（初回のみ）
npm install

# 環境変数を自動セットアップ
npm run setup
```

✅ このコマンドが以下を自動実行します：
- `.env.example` から `.env` をコピー
- `LINK_TOKEN_SECRET` と `CRON_SECRET` をランダム生成
- デフォルト値を自動設定（`PORT`、`EMAIL_FROM_ADDRESS` など）
- ローカル開発用の URL を設定

#### 3️⃣ 手動で 2 つのキーを設定

生成された `.env` ファイルを編集して、以下を追加：

| キー | 取得元 |
|------|--------|
| `SENDGRID_API_KEY` | [SendGrid Dashboard](https://app.sendgrid.com/settings/api_keys) → Create API Key |
| `ANTHROPIC_API_KEY` | [Anthropic Console](https://console.anthropic.com/settings/keys) |

```bash
# .env を編集
nano .env
```

以下を追加：
```bash
SENDGRID_API_KEY=SG.your-api-key-here
ANTHROPIC_API_KEY=sk-ant-your-api-key-here
```

---

### 📝 ローカル開発環境での手動設定（Vercel CLI が使えない場合）

Vercel CLI が使えない環境や、すべてを手動で設定したい場合：

1. `.env.example` をコピーして `.env` を作成:

```bash
cp .env.example .env
```

#### 🗄️ Supabase の設定（ダッシュボード手動取得）

Vercel Marketplace 統合を使わない場合のみ：

1. [Supabase ダッシュボード](https://supabase.com/dashboard) にログイン
2. プロジェクトを選択 → **Settings** → **API** に移動
3. 以下のキーをコピー：
   - **Project URL** → `.env` の `VITE_SUPABASE_URL` に貼り付け
   - **Service Role Secret** → `.env` の `SUPABASE_SERVICE_ROLE_KEY` に貼り付け
     - ⚠️ **Service Role Key は秘密です** — `.env` にのみ保存し、決してコミットしないこと

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 📧 SendGrid の設定（メール配信）

1. [SendGrid ダッシュボード](https://app.sendgrid.com) にログイン
2. **Settings** → **API Keys** に移動
3. **Create API Key** をクリック
   - Name: `hackathon-dev`（わかりやすい名前）
   - API Key Permissions: `Mail Send` をオンにする
4. 生成されたキーをコピー → `.env` の `SENDGRID_API_KEY` に貼り付け
5. メール送信元を設定：
   - `.env` の `EMAIL_FROM_ADDRESS` → 送信元メールアドレス（例: `notify@ai-hackason.example`）
   - `.env` の `EMAIL_FROM_NAME` → 送信元の表示名（例: `AI Hackathon 混雑通知`）

```bash
SENDGRID_API_KEY=SG.your-api-key-here
EMAIL_FROM_ADDRESS=notify@ai-hackason.example
EMAIL_FROM_NAME=AI Hackathon 混雑通知
```

#### 🤖 Claude API の設定（プラン生成）

1. [Anthropic Console](https://console.anthropic.com/settings/keys) にログイン
2. **API Keys** → **Create Key** をクリック
3. 生成されたキーをコピー → `.env` の `ANTHROPIC_API_KEY` に貼り付け

```bash
ANTHROPIC_API_KEY=sk-ant-your-api-key-here
# モデルをカスタマイズする場合のみ設定（デフォルト: claude-sonnet-5）
ANTHROPIC_MODEL=claude-sonnet-5
```

#### 🔐 その他の設定（ローカル開発）

```bash
PORT=3000
CORS_ALLOWED_ORIGINS=http://localhost:5173
VITE_API_URL=http://localhost:3000

# セキュリティ用シークレット（安全な長いランダム文字列に変更）
LINK_TOKEN_SECRET=change-me-to-a-long-random-string
CRON_SECRET=change-me-to-a-long-random-string
APP_BASE_URL=http://localhost:5173
```

### 本番環境（Vercel）でのシークレット設定

#### 🔄 自動設定される環境変数（Marketplace 統合）

Vercel Marketplace から Supabase を統合すると、以下は **自動的に設定**されます：

| キー | 取得元 | 自動同期 |
|------|--------|---------|
| `VITE_SUPABASE_URL` | Supabase | ✅ 自動 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | ✅ 自動 |

#### 📝 手動で設定が必要な環境変数

[Vercel ダッシュボード](https://vercel.com) → プロジェクトを選択 → **Settings** → **Environment Variables** に以下を追加：

| キー | 値 | 取得元 |
|------|-----|--------|
| `SENDGRID_API_KEY` | API Key | [SendGrid Dashboard](https://app.sendgrid.com/settings/api_keys) |
| `EMAIL_FROM_ADDRESS` | メール送信元アドレス | 任意（例: `notify@ai-hackason.example`） |
| `EMAIL_FROM_NAME` | 表示名 | 任意（例: `AI Hackathon`） |
| `ANTHROPIC_API_KEY` | API Key | [Anthropic Console](https://console.anthropic.com/settings/keys) |
| `ANTHROPIC_MODEL` | モデルID（オプション） | `claude-sonnet-5` |
| `LINK_TOKEN_SECRET` | 署名用シークレット | 自分で生成（下記参照） |
| `CRON_SECRET` | Cron認証シークレット | 自分で生成（下記参照） |
| `APP_BASE_URL` | `https://ai-hackason.vercel.app` | Vercel ダッシュボード |
| `CORS_ALLOWED_ORIGINS` | `https://ai-hackason.vercel.app` | 自分で設定 |

#### 🔐 セキュアなシークレット生成

```bash
# ローカルで安全なランダム文字列を生成
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 🚀 Vercel CLI でのプッシュ（オプション）

ローカルの `.env` を本番に反映させる場合：

```bash
# 本番環境に環境変数をプッシュ
vercel env push --environment=production
```

⚠️ **注意**：既存の環境変数を上書きします。本番にしかない設定がある場合は先に確認してください。

---

## 💻 開発環境の起動

1. WSL2 Ubuntu ターミナルを開く
2. リポジトリに移動:

```bash
cd /mnt/c/Develop/Projects/ai-hackason
```

3. 依存関係をインストール（初回のみ）:

```bash
npm install
```

4. **環境変数を自動セットアップ** ✨

```bash
npm run setup
```

このコマンドが以下を自動実行します：
- ✅ `.env.example` から `.env` をコピー
- ✅ `LINK_TOKEN_SECRET` と `CRON_SECRET` をランダム生成
- ✅ デフォルト値を自動設定（`PORT`、`EMAIL_FROM_ADDRESS` など）
- ✅ ローカル開発用の URL を設定

5. **手動で 2 つのキーを設定**

生成された `.env` ファイルを編集して、以下を追加：

```bash
# SendGrid API Key
# https://app.sendgrid.com/settings/api_keys から取得
SENDGRID_API_KEY=SG.your-api-key-here

# Claude API Key
# https://console.anthropic.com/settings/keys から取得
ANTHROPIC_API_KEY=sk-ant-your-api-key-here
```

6. 開発サーバーを起動:

```bash
npm run dev
```

7. ブラウザで http://localhost:5173 を開く

## 📁 リポジトリ構成

```
.
├─ src/                        ← フロントエンド（React）
├─ server/                     ← バックエンド（Express: auth/users/stores/media）
├─ api/                        ← バックエンド（Vercel Functions: reservations/crowd/analytics/errors/cron/mail）
├─ scripts/                    ← ローカル開発用cron
├─ tests/                      ← unit/integration/e2e（jest + playwright）
├─ docs/
│  ├─ ai-hackathon-team-ops/   ← チーム運用ドキュメント一式
│  ├─ architecture-audit/      ← アーキテクチャ監査報告・実装手順書
│  ├─ presentation/            ← 発表資料（Marp）
│  └─ database/                ← DBスキーマ・マイグレーション
└─ .github/
   └─ workflows/
      └─ sync-notion.yml       ← PRマージ時のNotion自動同期
```

## 💬 連絡先

質問・相談は Microsoft Teams のチームチャネルへ（Slackは使用していません）。
インフラ（Supabase/Vercel/GitHub設定）に関することは Kyosuke まで。

