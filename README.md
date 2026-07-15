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
- **バックエンド:** Node.js + Express + Claude API
- **データベース:** Supabase (PostgreSQL)
- **デプロイ:** Vercel（自動デプロイ）
- **ドキュメント:** Notion Database（PRマージ時に自動同期）
- **開発環境:** Ubuntu (WSL2) + Claude CLI

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

4. 開発サーバーを起動:

```bash
npm run dev
```

5. ブラウザで http://localhost:5173 を開く

## 📁 リポジトリ構成

```
.
├─ docs/
│  └─ ai-hackathon-team-ops/   ← チーム運用ドキュメント一式（16ファイル）
├─ .github/
│  └─ workflows/
│     └─ sync-notion.yml       ← PRマージ時のNotion自動同期
└─ （アプリ本体のソースコード）
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

