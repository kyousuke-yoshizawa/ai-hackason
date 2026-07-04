# AI Hackathon 2026 - セットアップ手順書
### GitHubリポジトリ作成 〜 Secrets登録・スキルセット配布・プロジェクト招待・開発環境選択

**担当:** 吉沢 協助 (Kyosuke)
**対象範囲:** GitHubリポジトリ作成 → Collaborators招待 → Supabase → Vercel → Notion → GitHub Secrets登録 → スキルセット配布 → Claude.aiプロジェクトへのメンバー招待 → GitHub操作方法の選択・Claude Codeローカル環境構築
**所要時間目安:** 70〜145分（Step 8, 9は状況により変動）

---

## 事前準備チェックリスト

作業を始める前に、以下のアカウントを用意してください。

- [ ] GitHub個人アカウント（Kyosuke分。他3名は各自作成済みであること）
- [ ] Supabaseアカウント（https://supabase.com）
- [ ] Vercelアカウント（https://vercel.com）
- [ ] Notionアカウント（https://notion.so）
- [ ] メンバー3名のGitHubユーザー名を控えておく（招待に必要）

---

## Step 1. GitHubリポジトリ作成

1. GitHubにログインし、右上の「+」→「New repository」をクリック
2. 以下を入力
   - **Repository name:** `ai-hackathon`
   - **Visibility:** Private を推奨（社内ハッカソンのため）
   - **Add a README file:** チェックを入れる
   - **.gitignore:** `Node` テンプレートを選択
3. 「Create repository」をクリック

### 1-2. Claude CLI インストール確認

1. Ubuntu ターミナルで Claude CLI がインストール済みか確認:

```bash
claude --version
```

2. 未インストールの場合:

```bash
npm install -g @anthropic-ai/claude-code
```

3. 動作確認: `claude` を実行し、認証フローが起動することを確認

### 1-3. gh CLI インストール

1. Ubuntu ターミナルで gh CLI をインストール:

```bash
sudo apt-get install -y gh
```

2. インストール確認:

```bash
gh --version
```

3. 認証設定（Personal Access Token を使用）:

```bash
export GH_TOKEN="ghp_your-personal-access-token"
gh auth status
```

> トークンは https://github.com/settings/tokens で発行（スコープ: `repo`, `workflow`）。  
> `.bashrc` に書かず、作業開始時に都度 export する。

---

## Step 2. Collaboratorsへの招待

1. リポジトリの `Settings` → `Collaborators` を開く
2. 「Add people」をクリック
3. メンバーA・B・CのGitHubユーザー名またはメールアドレスを1人ずつ入力して招待
4. 招待されたメンバーは、届いたメール内のリンクから「Accept invitation」をクリック

> **確認ポイント:** `Settings` → `Collaborators` の一覧に4名（Kyosuke含む）が表示されていればOK

---

## Step 3. Supabaseセットアップ

### 3-1. プロジェクト作成

1. https://supabase.com にログイン
2. 「New project」をクリック
3. 以下を入力
   - **Name:** `ai-hackathon`
   - **Database Password:** 強力なパスワードを生成し、必ず別途メモに保存（後で使いません。紛失時の緊急用）
   - **Region:** `Northeast Asia (Tokyo)` を選択（レイテンシ最小化のため）
4. 「Create new project」をクリックし、初期化完了（数分）を待つ

### 3-2. APIキーの取得

1. プロジェクト画面左メニューの `Project Settings` → `API` を開く
2. 以下の3つをメモ（後でGitHub Secretsに登録します）

| 項目名 | Supabase画面上の表示名 |
|---|---|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_ANON_KEY` | anon public（Project API keys内） |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role（同上。**バックエンドのみで使用、フロントに絶対に埋め込まない**） |

---

## Step 4. Vercelセットアップ

### 4-1. プロジェクト作成 & GitHub連携

1. https://vercel.com にログインし、「Add New...」→「Project」
2. 「Import Git Repository」から `ai-hackathon` を選択（GitHubアカウントの連携が初回は必要）
3. Framework Preset: `Vite` を選択（React + Vite構成のため）
4. Root Directory: フロントエンドのディレクトリ構成に合わせて設定（例: `frontend/` を分ける場合はここで指定）
5. 一旦「Deploy」をクリックしてビルドが通ることを確認（この時点でSupabaseキー未設定のため機能面はエラーで問題なし）

### 4-2. 環境変数の登録（Vercel側）

1. プロジェクト → `Settings` → `Environment Variables`
2. 以下を登録（Environment: `Production`, `Preview`, `Development` すべてにチェック）

| Key | Value |
|---|---|
| `VITE_SUPABASE_URL` | Step3-2の Project URL |
| `VITE_SUPABASE_ANON_KEY` | Step3-2の anon public key |

3. 「Save」後、再デプロイ（`Deployments` タブ → 最新のものの「...」→「Redeploy」）

### 4-3. Vercel APIトークンの取得（GitHub Actions連携用）

1. Vercelの右上アイコン → `Settings` → `Tokens`
2. 「Create Token」→ 名前を `ai-hackathon-ci` などにして作成
3. 表示されたトークンをメモ（`VERCEL_TOKEN`。再表示不可なので必ずこの場でコピー）
4. 同じくプロジェクトの `Settings` → `General` にある `Project ID` と、アカウント設定にある `Team ID`（個人アカウントの場合は不要な場合あり）もメモ

---

## Step 5. Notionセットアップ

### 5-1. Integration作成

1. https://www.notion.so/my-integrations を開く
2. 「New integration」をクリック
3. 名前: `ai-hackathon-sync` などとして作成
4. 発行された「Internal Integration Token」をメモ（`NOTION_API_KEY`）

### 5-2. データベース作成と連携

1. Notion上に以下4つのデータベースを作成（決定事項書の通り）
   - 要件定義書
   - 設計書
   - API仕様書
   - 実装ログ
2. 各データベースページ右上「...」→「Connect to」→ 先ほど作った `ai-hackathon-sync` を接続
3. 各データベースのURLから **Database ID**（URL内の32桁の英数字部分）を控える

> 例: `https://notion.so/xxxxx?v=yyyy` の `xxxxx` 部分がDatabase ID

---

## Step 6. GitHub Secretsへの一括登録

1. リポジトリの `Settings` → `Secrets and variables` → `Actions` を開く
2. 「New repository secret」から、以下を1つずつ登録

| Secret名 | 値の取得元 |
|---|---|
| `SUPABASE_URL` | Step3-2 |
| `SUPABASE_ANON_KEY` | Step3-2 |
| `SUPABASE_SERVICE_ROLE_KEY` | Step3-2 |
| `VERCEL_TOKEN` | Step4-3 |
| `VERCEL_PROJECT_ID` | Step4-3 |
| `VERCEL_ORG_ID` | Vercelチーム/アカウント設定 |
| `NOTION_API_KEY` | Step5-1 |
| `NOTION_DB_REQUIREMENTS` | Step5-2（要件定義書DB ID） |
| `NOTION_DB_DESIGN` | Step5-2（設計書DB ID） |
| `NOTION_DB_API_SPEC` | Step5-2（API仕様書DB ID） |
| `NOTION_DB_IMPL_LOG` | Step5-2（実装ログDB ID） |
| `ANTHROPIC_API_KEY` | Claude API利用のため（console.anthropic.comで発行） |

> **注意:** Secretsは登録後、値の確認ができません（上書きのみ可能）。登録時に打ち間違いがないか、コピー&ペーストで慎重に。

---

## Step 7. スキルセットの配布

作成済みの `ai-hackathon-team-ops-ultimate.tar.gz`（SKILL.md含む16ファイル）をチームに展開する手順です。
配布方法は用途に応じて2通りあります。両方併用しても構いません。

### 7-1. リポジトリ配置（推奨・全員が必ず参照できる形）

Teamsの通知やGitHub上のレビューで「どこに何が書いてあるか」を全員が確認できるよう、
まずはリポジトリ内に配置します。

1. `ai-hackathon-team-ops-ultimate.tar.gz` をダウンロード
2. WSL2 Ubuntu ターミナル上で展開し `docs/ai-hackathon-team-ops/` に配置

```bash
mkdir -p docs/ai-hackathon-team-ops
tar -xzf ai-hackathon-team-ops-ultimate.tar.gz -C docs/ai-hackathon-team-ops --strip-components=1
```

3. コミット & プッシュ

```bash
git add docs/ai-hackathon-team-ops
git commit -m "docs: add ai-hackathon-team-ops skillset"
git push origin main
```

4. Teamsで全員に通知（`docs/ai-hackathon-team-ops/README.md` へのGitHubリンクを貼る）
5. 全員が `README.md` → `SKILL.md` → `references/ai-harness-core.md` → 自分の役割ファイル、の順で読了する

### 7-2. 個人のClaude Skillとして保存する（任意）

`SKILL.md` にYAML frontmatter（`name` / `description`）が入っているため、Claude.ai上でこのファイル
（または配布された `.skill` ファイル）をアップロードすると、ファイルカードに **「Save skill」** ボタンが
表示され、クリックすることで各自のClaude利用環境にスキルとしてインストールできます（この機能が
有効な組織の場合）。これを行うと、リポジトリを開かなくてもClaudeとの会話中に自動でこのスキルが
参照されるようになります。

- リポジトリ配置（7-1）: **全員が同じドキュメントを参照できる**ことを保証する手段
- 個人インストール（7-2）: **Claudeが会話中に自動でトリガーする**ようにする手段

どちらも目的が異なるため、少なくとも7-1は必須、7-2は各自の利用スタイルに応じて任意で行ってください。

### 7-3. 更新時の運用

SKILL.mdや各referenceファイルを修正した場合は、以下を忘れずに行います。

- [ ] `MANIFEST.txt` のファイル一覧・行数情報を最新化
- [ ] `ai-hackathon-team-ops-ultimate.tar.gz` を作り直して再配布（7-1の手順を再実行）
- [ ] 個人でSkillを保存している人には、Teamsで「更新版を再アップロードしてください」と案内
- [ ] コミットメッセージは `docs: update xxx.md` のように変更内容がわかる形にする

---

## Step 8. 本プロジェクト（Claude.aiのプロジェクト）へのメンバー招待

この決定事項書や本手順書が置かれているClaude.ai上の「プロジェクト」に、チームメンバーを
招待する場合の考え方です。

> **注意:** プロジェクトの共有可否・具体的な招待手順はプラン（Free/Pro/Team/Enterprise）によって
> 異なり、UIも変更されることがあります。正確な最新手順は必ず
> **https://support.claude.com** で確認してください。以下は一般的な考え方のみです。

### 共有できる場合（Team/Enterpriseプランなど組織アカウントの場合）

- 組織（Workspace）に所属しているメンバーであれば、プロジェクトを共有できることがあります
- プロジェクト画面から共有・メンバー追加に相当する操作を探し、招待したいメンバーのアカウントを指定します
- 招待されたメンバーは、プロジェクト内の会話・アップロード済みファイル（この決定事項書等）にアクセスできるようになります

### 共有できない場合（個人プランなど）

プランの都合でプロジェクトそのものを共有できない場合は、この決定事項書の中にある
「別のアカウントで引き継ぐ場合」の手順と同じ方法で代替できます。

1. `hackathon-2026-decisions.json`（または`.md`）をダウンロード
2. 各メンバーが自分のClaude.aiアカウントで新しい会話（またはプロジェクト）を開始
3. このファイルをアップロードし、「このハッカソン設定に基づいて進めて」と指示する
4. 併せて `ai-hackathon-team-ops-ultimate.tar.gz` の内容（またはSKILL.md単体）もアップロードすれば、Step 7-2の手順で各自のSkillとしても保存できる

この方法なら、Claude.aiのプラン・共有機能の仕様に依存せず、Teams経由でファイルを配布するだけで
全員が同じ前提・同じスキルセットで会話を始められます。

### どちらを使うべきか

- 組織アカウントでプロジェクト共有ができるなら、それが最も手間が少ない
- できない・不明な場合は、上記の「ファイル配布」方式を使えば確実に情報を引き継げる
- 迷った場合は両方試して問題ない（矛盾する情報にはならない）

---

## Step 9. GitHubを実際に操作する方法の選び方

Step 1〜8はブラウザで手動操作する前提で書いていますが、実際には複数の選択肢があります。
「誰が実際に手を動かすか」で整理すると以下の通りです。

| 方法 | git実行者 | 今すぐ使えるか |
|---|---|---|
| 本手順書の通り手動操作 | あなた自身がブラウザで手作業 | 追加セットアップ不要、今すぐ可能 |
| Claude in Chrome | Claudeがブラウザを操作（クリック代行） | ベータ機能の有効化が必要 |
| Claude Code（Web版） | Claudeがクラウド上でgitコマンド等を実行 | 組織オーナーがGitHub連携を有効化する必要あり |
| Claude Code（ローカル） | Claudeがあなたの端末上でgitコマンド等を実行 | ターミナル（WSL2 + Ubuntu）のセットアップが必要 |

**実際にgitコマンドを代行実行できるのはClaude Code（Web版・ローカルいずれか）のみ**です。
手動操作やClaude in ChromeはあくまでGitHubのWeb UIをブラウザ経由で操作するだけで、
裏でgit自体が動いているわけではありません。

ターミナルセットアップを避けたい場合はStep 8のブラウザ系の方法へ、実際にClaude Codeに
gitコマンドを任せたい場合は次の9-1に進んでください。

### 9-1. Claude Codeローカル利用のためのWSL2 + Ubuntuセットアップ

本プロジェクトは全員が WSL2 上の Ubuntu + Claude CLI で作業する環境に統一しています。
コマンドプロンプトやPowerShellではなく、WSL2上のUbuntuターミナルを使用してください。
Linux系環境でGit/npm系ツールとの相性が良く、チーム全員の環境が揃うためです。

#### 手順

1. Windows PowerShell（管理者権限）を開き、以下を実行

```powershell
wsl --install -d Ubuntu
```

2. 再起動を求められたら再起動する
3. 初回起動時にUbuntu側のユーザー名・パスワードを設定する
4. Ubuntu内で更新とNode.jsを導入する

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nodejs npm
```

5. バージョンを確認する

```bash
node -v
npm -v
```

> **重要:** Claude Codeは **Node.js 22以上** が必要です。UbuntuのAPT標準リポジトリの`nodejs`は
> バージョンが古いことが多いため（`node -v`で22未満と表示された場合）、以下でNode.js 22系に
> 入れ替えてください。

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # v22.x.x になっていればOK
```

6. Claude Codeをインストールする

```bash
npm install -g @anthropic-ai/claude-code
```

7. インストール確認とログイン

```bash
claude --version
claude
```

`claude`コマンドを初回実行すると、Anthropicアカウントでのログイン（ブラウザでの認証）を
求められます。案内に従ってログインすれば準備完了です。

8. `ai-hackason`リポジトリのディレクトリに移動してから起動すると、そのリポジトリを
   対象にコーディングを進められます

```bash
cd ~/ai-hackason   # cloneしてある場所に合わせて調整
claude
```

> インストール方法・必要要件は変更される可能性があるため、うまくいかない場合は公式ドキュメントも
> 確認してください → https://docs.claude.com/en/docs/claude-code/overview

#### 所要時間の目安（まっさらな状態からの場合）

| 作業 | 目安時間 |
|---|---|
| WSL2の有効化（Windows機能のオン、再起動含む） | 5〜10分 |
| Ubuntuのインストール | 5〜15分（ダウンロード時間次第） |
| 初回起動・ユーザー設定 | 2〜3分 |
| `apt update && apt upgrade` | 3〜10分 |
| Node.js導入（22系への入れ替え含む） | 5〜10分 |
| Claude Codeインストール・ログイン | 2〜3分 |
| **合計目安** | **25〜55分程度** |

つまずきやすいポイント: WSL2有効化直後のWindows再起動、BIOS/UEFIで仮想化が無効になっている
PCでの追加設定。特に問題なければ上記の範囲に収まることが多いです。

> **注意:** Windowsネイティブ（コマンドプロンプト/PowerShell）でもNode.js経由でClaude Codeが
> 動く可能性はありますが、本プロジェクトはWSL2 + Ubuntu前提で全員の環境を揃えると決めているため、
> Kyosukeさんだけ別環境にすると後のトラブルシュートが煩雑になります。特別な事情がなければ
> WSL2 + Ubuntuを使ってください。

---

## 完了確認チェックリスト

- [ ] `ai-hackathon` リポジトリ作成済み、4名がCollaboratorsに表示されている
- [ ] 全員がWSL2 Ubuntuターミナルから `claude` を起動できることを確認済み
- [ ] Supabaseプロジェクト作成済み、3つのキーを取得済み
- [ ] Vercelでビルド・デプロイが成功している
- [ ] Notion Integration作成済み、4つのDBに接続済み
- [ ] GitHub Secretsに上記12項目すべて登録済み
- [ ] スキルセットを `docs/ai-hackathon-team-ops/` に配置しpush済み
- [ ] Teamsで全員に「セットアップ完了、開発開始できます」と通知した
- [ ] 全員が `README.md` / `SKILL.md` / `ai-harness-core.md` / 自分の役割ファイルを読了した

これが完了すれば、開発開始前チェックリスト（`checklists/pre-launch.md`）に進めます。
