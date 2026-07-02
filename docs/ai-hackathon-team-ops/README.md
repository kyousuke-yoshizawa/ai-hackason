# AI Hackathon 2026 - README（セットアップ・使い方ガイド）

このREADMEは、チーム全員（Kyosuke・フロント担当・バック担当・QA担当）が
開発を始める前に読む「はじめに」のドキュメントです。

---

## 目次

1. このドキュメントの目的
2. 事前に必要なもの
3. 開発環境（Codespaces）の使い方
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

## 3. 開発環境（Codespaces）の使い方

### 起動方法

1. GitHubで `ai-hackathon` リポジトリを開く
2. 緑色の「Code」ボタン → 「Codespaces」タブ → 「Create codespace on main」
3. ブラウザ上にVS Code風の画面が開く（1分ほどで起動）

### 初回セットアップ（Codespaces内のターミナルで実行）

```bash
npm install
cp .env.example .env   # 環境変数はGitHub Secretsから自動注入される想定
npm run dev
```

### 注意: Codespaces時間の節約

- GitHub Freeプランは **月60時間まで無料**。4人で共有するリソースです。
- 作業しないときは必ずCodespacesを停止（Stop）してください（自動的に一定時間で止まりますが、手動停止を推奨）。
- 目安: 1人あたり15時間以内（4人で合計60時間）

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
| Codespacesが起動しない | 60時間の上限に達していないか確認（GitHub側の使用量画面） |
| `npm install` が失敗する | Node.jsのバージョン確認（`node -v`。18系を想定） |
| PRがマージできない（コンフリクト） | `references/pr-review-merge-flow.md` の「コンフリクト解消」セクション参照 |
| Vercelのデプロイが失敗する | 環境変数（Supabaseキー等）がVercel側に登録されているか確認 |
| Notionが更新されない | GitHub Actionsの実行ログ（Actionsタブ）を確認し、Kyosukeに連絡 |

## 7. 用語集

- **Codespaces:** GitHubが提供するブラウザ上の開発環境
- **PR（Pull Request）:** 変更を統合するためのレビュー依頼
- **Secrets:** GitHubリポジトリに安全に保存するAPIキー等の機密情報
- **Collaborator:** リポジトリへの書き込み権限を持つメンバー

---

さらに詳しい内容は `SKILL.md`（全体像）および各 `references/*.md` を参照してください。
