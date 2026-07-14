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

### ローカル開発環境での設定

1. `.env.example` をコピーして `.env` を作成:

```bash
cp .env.example .env
```

2. 各サービスから API キーを取得し、`.env` に設定します：

#### 🗄️ Supabase の設定

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

Vercel へのデプロイ時、**環境変数は GitHub にコミットせず**、Vercel ダッシュボードで設定してください。

1. [Vercel ダッシュボード](https://vercel.com) → プロジェクトを選択
2. **Settings** → **Environment Variables** に移動
3. 以下を「本番環境（Production）」に追加：

| キー | 値 | 取得元 | 用途 |
|------|-----|--------|------|
| `VITE_SUPABASE_URL` | Supabase Project URL | Supabase Dashboard | DB接続（バックエンド） |
| `SUPABASE_SERVICE_ROLE_KEY` | Service Role Secret | Supabase Dashboard | DB操作（RLSバイパス） |
| `SENDGRID_API_KEY` | API Key | SendGrid Dashboard | メール送信 |
| `EMAIL_FROM_ADDRESS` | 送信元メール | 任意（例: notify@ai-hackason.example） | メール送信元 |
| `EMAIL_FROM_NAME` | 表示名 | 任意（例: AI Hackathon） | メール送信元名 |
| `ANTHROPIC_API_KEY` | API Key | Anthropic Console | Claude API（プラン生成） |
| `ANTHROPIC_MODEL` | モデルID | Anthropic コンソール | Claude モデル選択（オプション） |
| `LINK_TOKEN_SECRET` | ランダムな長い文字列 | 自分で生成 | リンクトークン署名 |
| `CRON_SECRET` | ランダムな長い文字列 | 自分で生成 | Cron 認証 |
| `APP_BASE_URL` | `https://ai-hackason.vercel.app` | Vercel ダッシュボード | 本番 URL |
| `CORS_ALLOWED_ORIGINS` | `https://ai-hackason.vercel.app` | 自分で設定 | CORS許可オリジン |

**セキュアなシークレット生成:**
```bash
# 開発用シェルで安全なランダム文字列を生成
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 💻 開発環境の起動

1. WSL2 Ubuntu ターミナルを開く
2. リポジトリに移動:

```bash
cd /mnt/c/Develop/Projects/ai-hackason
```

3. 環境変数を設定（上記の「ローカル開発環境での設定」に従う）

4. 依存関係をインストール（初回のみ）:

```bash
npm install
```

5. 開発サーバーを起動:

```bash
npm run dev
```

6. ブラウザで http://localhost:5173 を開く

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

