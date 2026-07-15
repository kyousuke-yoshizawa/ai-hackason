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

#### 1️⃣ Vercel Marketplace から Supabase 統合をインストール（インフラ担当 Kyosuke のみ）

1. [Vercel ダッシュボード](https://vercel.com) → **Integrations** → **Supabase** を検索
2. **Install** をクリック
3. Supabase プロジェクトを選択
4. Vercel プロジェクトをリンク

✅ これで以下の環境変数が **Vercel に自動設定**されます（**1回だけ設定すればチーム全員が使用**）：
- `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

⏭️ チームメンバーは以下にスキップしてください。

#### 2️⃣ npm run setup で残りを自動セットアップ（チーム全員が初回に実行）

各開発者が **自分のローカル環境で 1 回だけ**実行：

```bash
# 依存関係をインストール（初回のみ）
npm install

# 環境変数を自動セットアップ（ローカル開発環境用）
npm run setup
```

✅ このコマンドが各開発者のローカル環境で以下を自動実行します：
- `.env.example` から `.env` をコピー
- `LINK_TOKEN_SECRET` と `CRON_SECRET` をランダム生成（各環境で異なる）
- デフォルト値を自動設定（`PORT`、`EMAIL_FROM_ADDRESS` など）
- ローカル開発用の URL を設定

#### 3️⃣ 手動で 2 つのキーを設定（チーム全員が同じキーを使用）

生成された `.env` ファイルを編集して、以下を追加：

⚠️ **重要**: 以下の 2 つのキーは**チーム全員が同じ値を使用します**
（Kyosuke から教えてもらうか、チーム共有ドキュメントを参照）

| キー | 取得元 | 共有方法 |
|------|--------|---------|
| `SENDGRID_API_KEY` | [SendGrid Dashboard](https://app.sendgrid.com/settings/api_keys) | チーム共有（Kyosuke が管理） |
| `ANTHROPIC_API_KEY` | [Anthropic Console](https://console.anthropic.com/settings/keys) | チーム共有（Kyosuke が管理） |

```bash
# .env を編集
nano .env
```

Kyosuke から提供されたキーを追加：
```bash
SENDGRID_API_KEY=SG.xxx...（チーム共有キー）
ANTHROPIC_API_KEY=sk-ant-xxx...（チーム共有キー）
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

4. **環境変数を自動セットアップ**（初回のみ）✨

```bash
npm run setup
```

このコマンドが以下を自動実行します：
- ✅ `.env.example` から `.env` をコピー
- ✅ `LINK_TOKEN_SECRET` と `CRON_SECRET` をランダム生成
- ✅ デフォルト値を自動設定（`PORT`、`EMAIL_FROM_ADDRESS` など）
- ✅ ローカル開発用の URL を設定

5. **手動で 2 つのキーを設定**（チーム共有キーを追加）

生成された `.env` ファイルを編集して、チーム共有キーを追加：

```bash
# SendGrid API Key（チーム共有）
SENDGRID_API_KEY=SG.your-api-key-here

# Claude API Key（チーム共有）
ANTHROPIC_API_KEY=sk-ant-your-api-key-here
```

⏹️ **キーの取得**は Kyosuke に確認してください（各自で発行しないでください）

6. 開発サーバーを起動:

```bash
npm run dev
```

7. ブラウザで http://localhost:5173 を開く

---

## 👥 チームメンバー別セットアップガイド

### 🔧 Kyosuke（吉沢・インフラリード）向け

**初回セットアップ**（プロジェクト開始時に 1 回だけ）

```bash
# 1. ローカル環境セットアップ
git clone <repo-url>
cd ai-hackason
npm install

# 2. Vercel Marketplace から Supabase 統合をインストール
#    → https://vercel.com → Integrations → Supabase を検索・インストール
#    → Supabase プロジェクトと Vercel プロジェクトをリンク

# 3. ローカルセットアップ
npm run setup

# 4. SendGrid API Key を発行
#    → https://app.sendgrid.com/settings/api_keys → Create API Key
#    → .env に設定

# 5. Anthropic API Key を発行
#    → https://console.anthropic.com/settings/keys → Create Key
#    → .env に設定

# 6. 本番環境に手動設定（Vercel ダッシュボード）
#    → Settings → Environment Variables → Production に以下を追加：
#    - SENDGRID_API_KEY
#    - ANTHROPIC_API_KEY
#    - その他（詳細は README 環境変数セットアップガイドを参照）

# 7. 動作確認
npm run dev
npm run server  # 別ターミナル
# http://localhost:5173 にアクセス確認
```

**その後**
- SendGrid と Anthropic のキーをチームメンバーに共有（安全に）
- GitHub リポジトリへのアクセス権限を付与

---

### 💻 フロント担当向け

**初回セットアップ**（開発開始時に 1 回だけ）

```bash
# 1. リポジトリをクローン
git clone <repo-url>
cd ai-hackason

# 2. 依存関係をインストール
npm install

# 3. ローカル環境変数を自動生成
npm run setup

# 4. チーム共有キーを .env に設定
#    → Kyosuke から以下を入手して .env に追加：
#    - SENDGRID_API_KEY
#    - ANTHROPIC_API_KEY

# 5. フロント開発サーバーを起動
npm run dev

# 6. ブラウザで http://localhost:5173 を開く
```

**開発時のコマンド**
```bash
npm run dev           # フロント開発サーバー起動
npm run lint          # TypeScript/TSX チェック
npm run build         # ビルド
npm test              # テスト実行
npm run test:watch    # テスト監視モード
```

**注意**
- `.env` ファイルを git にコミット**しないでください**
- バックエンド（Express）が必要な場合は別ターミナルで `npm run server` を実行
- 詳細は `docs/ai-hackathon-team-ops/agents/frontend-subagent.md` を参照

---

### 🔌 バック担当向け

**初回セットアップ**（開発開始時に 1 回だけ）

```bash
# 1. リポジトリをクローン
git clone <repo-url>
cd ai-hackason

# 2. 依存関係をインストール
npm install

# 3. ローカル環境変数を自動生成
npm run setup

# 4. チーム共有キーを .env に設定
#    → Kyosuke から以下を入手して .env に追加：
#    - SENDGRID_API_KEY
#    - ANTHROPIC_API_KEY

# 5. Express バックエンドを起動
npm run server

# 6. 動作確認（別ターミナルで）
curl http://localhost:3000/api/health
```

**開発時のコマンド**
```bash
npm run server        # Express サーバー起動（ホットリロード対応）
npm run typecheck     # 全体の型チェック
npm run lint          # ESLint + TypeScript チェック
npm run build         # ビルド
npm test              # テスト実行
npm run cron:dev      # ローカル Cron テスト（混雑通知）
npm run cron:dev:analytics  # ローカル Cron テスト（分析集計）
```

**API サーバー**
- Express: `http://localhost:3000`
- Vercel Functions: `api/` ディレクトリ（本番環境で使用）

**注意**
- `.env` ファイルを git にコミット**しないでください**
- フロント開発サーバーも必要な場合は別ターミナルで `npm run dev` を実行
- 詳細は `docs/ai-hackathon-team-ops/agents/backend-subagent.md` を参照

---

### ✅ QA 担当向け

**初回セットアップ**（テスト開始時に 1 回だけ）

```bash
# 1. リポジトリをクローン
git clone <repo-url>
cd ai-hackason

# 2. 依存関係をインストール
npm install

# 3. ローカル環境変数を自動生成
npm run setup

# 4. チーム共有キーを .env に設定
#    → Kyosuke から以下を入手して .env に追加：
#    - SENDGRID_API_KEY
#    - ANTHROPIC_API_KEY

# 5. 開発環境を起動（別々のターミナルで）
npm run dev           # ターミナル 1：フロント
npm run server        # ターミナル 2：バック

# 6. テストを実行
npm run test          # ユニット・統合テスト
npm run test:e2e      # E2E テスト（Playwright）
npm run test:all      # 全テスト実行
```

**QA 用コマンド**
```bash
npm run test:coverage  # カバレッジレポート確認
npm run lint           # コードチェック
npm run build          # ビルド確認
```

**テストアクセス**
- フロント: http://localhost:5173
- バック API: http://localhost:3000

**注意**
- テストアカウント情報は `docs/database/USER_TABLE_README.md` を参照
- E2E テストは Playwright（Chrome）を使用
- `.env` ファイルを git にコミット**しないでください**
- 詳細は `docs/ai-hackathon-team-ops/agents/qa-subagent.md` を参照

---

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

## 🎞️ スライド作成環境（Marp）

発表資料は [Marp](https://marp.app/) で作成します。Markdownで書いたスライドを HTML / PDF / PPTX に変換できます。Marpを初めて使う人でも、この手順だけでセットアップできます。

### 必要な環境

- **Node.js 18以上**（[Marp CLI](https://github.com/marp-team/marp-cli) の必須要件）

バージョン確認:

```bash
node -v
```

`v18.x.x` 以降でなければ、[開発環境の起動](#-開発環境の起動)と同じNode.jsで動作します（本プロジェクトの開発サーバーもNode.js 18以上を前提としています）。

### Marp CLIのインストール

インストール不要ですぐ試したい場合は `npx` 経由で実行できます（追加インストールなしでコマンドをそのまま使えます）。

```bash
npx @marp-team/marp-cli --version
```

繰り返し使う場合はプロジェクトの devDependencies に追加するのがおすすめです。

```bash
npm install -D @marp-team/marp-cli
```

インストール後は `npx marp` で呼び出せます。

### スライドファイルの作成

Markdownファイルを作成し、先頭に `marp: true` を指定します。

```markdown
---
marp: true
---

# タイトルスライド

---

## 2枚目のスライド

- 箇条書き1
- 箇条書き2
```

### プレビュー方法

`-w`（watch）オプションを付けるとファイル保存のたびに自動でプレビューが更新されます。

```bash
npx marp -w slides.md
```

ブラウザでプレビューサーバーが起動するので、表示されたURL（例: `http://localhost:8080`）を開いて確認します。

#### VS Codeで確認する場合

VS Code拡張機能 [Marp for VS Code](https://marketplace.visualstudio.com/items?itemName=marp-team.marp-vscode) を入れると、エディタ上でリアルタイムプレビューできます。

1. VS Codeの拡張機能タブで `Marp for VS Code` を検索してインストール
2. スライドMarkdownを開き、右上のプレビューアイコンをクリック

### HTML・PDF・PPTXへの出力

出力したい形式に合わせてオプションを指定します（PDF/PPTX出力にはChromeが必要です。未インストールの場合はMarp CLIの案内に従ってください）。

```bash
# HTMLに出力
npx marp slides.md -o slides.html

# PDFに出力
npx marp slides.md -o slides.pdf --pdf

# PPTXに出力
npx marp slides.md -o slides.pptx --pptx
```

### よく使うMarpコマンド

| コマンド | 説明 |
|---|---|
| `npx marp slides.md` | Markdownをスライド用HTMLに変換 |
| `npx marp -w slides.md` | ファイル変更を監視し自動プレビュー更新 |
| `npx marp -s .` | カレントディレクトリをサーバーとして公開しプレビュー |
| `npx marp slides.md -o slides.html` | HTMLファイルに出力 |
| `npx marp slides.md -o slides.pdf --pdf` | PDFファイルに出力 |
| `npx marp slides.md -o slides.pptx --pptx` | PowerPoint(PPTX)ファイルに出力 |
| `npx marp --version` | インストール済みMarp CLIのバージョン確認 |

### トラブルシューティング: PPTX/PDF出力でChromeが見つからない場合

PPTX/PDF出力は内部でheadless Chromeを起動します。環境にChrome/Edge/Firefoxが無いと、以下のようなエラーになります。

```
[ ERROR ] Failed converting Markdown. (No suitable browser found. Please ensure
          one of the following browsers is installed: chrome, edge, firefox)
```

#### 基本の対処

Puppeteer経由でChromeをインストールします。

```bash
npx puppeteer browsers install chrome
```

`sudo apt-get install -y unzip` が実行できる環境であれば、先にこれを済ませてから上記コマンドを実行するのが確実です（後述の通り、`unzip`が無いとダウンロードしたzipが展開されずエラーメッセージも出ないまま失敗することがあります）。

#### `sudo`が使えない・`unzip`が無い環境での回避策

WSL2上のサンドボックス環境などで`sudo`にパスワードが必要（＝実質使えない）かつ`unzip`コマンドも無い場合、`npx puppeteer browsers install chrome`はエラーメッセージを出さずに失敗し、`~/.cache/puppeteer/chrome/`配下に中身が空のディレクトリだけが残ります。この場合は以下の手順で手動インストールできます。

1. 空になった展開先ディレクトリを削除

   ```bash
   rm -rf ~/.cache/puppeteer/chrome/<version> ~/.cache/puppeteer/chrome-headless-shell/<version>
   ```

2. Chrome for Testingのzipを直接ダウンロード（URLのバージョン番号は`npx puppeteer browsers install chrome`の出力やhttps://googlechromelabs.github.io/chrome-for-testing/ で確認）

   ```bash
   curl -o chrome-linux64.zip \
     "https://storage.googleapis.com/chrome-for-testing-public/<version>/linux64/chrome-linux64.zip"
   ```

3. `unzip`が無くても`python3`（標準ライブラリの`zipfile`）で展開可能

   ```bash
   python3 -c "import zipfile; zipfile.ZipFile('chrome-linux64.zip').extractall('.')"
   ```

   `zipfile.extractall()`は実行ビットを復元しないため、`chrome`本体と`chrome_crashpad_handler`に実行権限を付与し直します。

   ```bash
   chmod +x chrome-linux64/chrome chrome-linux64/chrome_crashpad_handler
   ```

4. `libnspr4` / `libnss3`系の共有ライブラリが無いと起動時に`error while loading shared libraries`で失敗します。`sudo`無しでも`apt-get download`（ダウンロードのみなのでroot不要）と`dpkg-deb -x`（展開のみなのでroot不要）でユーザー領域にインストールできます。

   ```bash
   mkdir -p ~/.local/chrome-libs
   cd /tmp
   apt-get download libnspr4 libnss3
   dpkg-deb -x libnspr4_*.deb ~/.local/chrome-libs
   dpkg-deb -x libnss3_*.deb ~/.local/chrome-libs
   ```

5. Marp CLI実行時に`LD_LIBRARY_PATH`と`CHROME_PATH`を指定

   ```bash
   export LD_LIBRARY_PATH=~/.local/chrome-libs/usr/lib/x86_64-linux-gnu:$LD_LIBRARY_PATH
   export CHROME_PATH=~/.cache/puppeteer/chrome/<version>/chrome-linux64/chrome
   npx marp slides.md -o slides.pptx --pptx
   ```

## 💬 連絡先

質問・相談は Microsoft Teams のチームチャネルへ（Slackは使用していません）。
インフラ（Supabase/Vercel/GitHub設定）に関することは Kyosuke まで。

