# AI Hackathon 2026 - README（セットアップ・使い方ガイド）

このREADMEは、チーム全員（Kyosuke・フロント担当・バック担当・QA担当）が
開発を始める前に読む「はじめに」のドキュメントです。

---

## 目次

1. このドキュメントの目的
2. 事前に必要なもの
3. 開発環境（Ubuntu + Claude CLI）の使い方
4. 日々の開発フロー
5. 役割別ガイドの読み方
6. トラブルシューティング
7. 用語集

---

## 1. このドキュメントの目的

AI Hackathon 2026では、4人チームで20時間以内に「動く本番アプリケーション」を
作り上げます。全員がGitHub初心者という前提のもと、迷わず開発に集中できるよう
このスキルセットを用意しました。

## 2. 事前に必要なもの

- [ ] GitHubアカウント（個人）
- [ ] `ai-hackathon` リポジトリへのCollaborator招待を受諾済み
- [ ] Microsoft Teamsのチームチャネルに参加済み
- [ ] （任意）Notionアカウント

インフラ（Supabase / Vercel / GitHub Secrets）のセットアップはKyosukeが
`setup-guide-github-to-secrets.md` に沿って先に完了させます。

## 3. 開発環境（Ubuntu + Claude CLI）の使い方

### セットアップ（初回のみ）

1. WSL2 を有効化し、Ubuntu を Microsoft Store からインストール
2. Node.js をインストール（nvm 推奨）:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install --lts
```

3. Claude CLI をインストール:

```bash
npm install -g @anthropic-ai/claude-code
```

4. 初回認証（初回起動時に案内に従って認証）:

```bash
claude
```

5. GitHub CLI をインストール（PR・マージ操作に使用）:

```bash
sudo apt-get install -y gh
```

初回認証（Personal Access Token が必要）:

```bash
export GH_TOKEN="ghp_your-personal-access-token"
gh auth status  # 認証確認
```

> トークンは https://github.com/settings/tokens で発行（スコープ: `repo`, `workflow`）。
> `.bashrc` には書かない（セキュリティ上の理由）。都度 export して使う。

### 毎日の起動手順

1. Ubuntu ターミナルを開く
2. プロジェクトディレクトリへ移動:

```bash
cd /mnt/c/Develop/Projects/ai-hackason
```

3. 開発サーバーを起動:

```bash
npm run dev
```

4. AI 支援を開始（別タブ推奨）:

```bash
claude
```

5. ブラウザで http://localhost:5173 を確認

## 4. 日々の開発フロー

```
1. Issueを確認・作成（担当タスクを明確にする）
2. ブランチを作成（例: feature/login-form）
3. 実装
4. コミット & プッシュ
5. PR（プルリクエスト）作成
6. レビュー（reviewer-subagent.md参照）
7. Kyosukeまたはレビュアーがマージ
8. マージ後、Vercelが自動デプロイ / Notionが自動更新
```

具体的な手順は `references/github-git-tutorial.md` と
`references/pr-review-merge-flow.md` を参照してください。

## 5. 役割別ガイドの読み方

自分の役割に応じて、以下を重点的に読んでください。

| 役割 | 読むべきファイル |
|---|---|
| フロント担当 | `agents/frontend-subagent.md` |
| バック担当 | `agents/backend-subagent.md` |
| Kyosuke（インフラ） | `agents/infra-subagent.md`, `references/supabase-vercel-setup.md`, `references/notion-database-config.md` |
| QA担当 | `agents/qa-subagent.md` |
| 全員 | `references/github-git-tutorial.md`, `references/pr-review-merge-flow.md`, `references/ai-harness-core.md` |

## 6. トラブルシューティング

| 症状 | 対処 |
|---|---|
| `claude` コマンドが見つからない | `npm install -g @anthropic-ai/claude-code` を再実行 / Node.js バージョン確認（`node -v`） |
| `npm install` が失敗する | Node.jsのバージョン確認（`node -v`。18系を想定） |
| PRがマージできない（コンフリクト） | `references/pr-review-merge-flow.md` の「コンフリクト解消」セクション参照 |
| Vercelのデプロイが失敗する | 環境変数（Supabaseキー等）がVercel側に登録されているか確認 |
| Notionが更新されない | GitHub Actionsの実行ログ（Actionsタブ）を確認し、Kyosukeに連絡 |

## 7. 用語集

- **Claude CLI:** Anthropic が提供する AI 支援 CLI ツール。Ubuntu ターミナルから `claude` コマンドで起動する
- **PR（Pull Request）:** 変更を統合するためのレビュー依頼
- **Secrets:** GitHubリポジトリに安全に保存するAPIキー等の機密情報
- **Collaborator:** リポジトリへの書き込み権限を持つメンバー

---

さらに詳しい内容は `SKILL.md`（全体像）および各 `references/*.md` を参照してください。
