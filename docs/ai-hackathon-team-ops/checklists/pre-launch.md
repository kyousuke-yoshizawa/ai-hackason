# 開発開始24時間前チェックリスト

対象: Kyosuke（実施責任者）+ 全メンバー（該当箇所）

---

## インフラ（Kyosuke）

- [ ] GitHubリポジトリ `ai-hackathon` 作成済み
- [ ] メンバー全員がCollaboratorとして招待・承諾済み
- [ ] ブランチ保護ルール設定済み（main保護）
- [ ] Supabaseプロジェクト作成済み、APIキー取得済み
- [ ] Vercelプロジェクト作成済み、GitHub連携・初回デプロイ成功済み
- [ ] Notion Integration作成済み、4つのDBに接続済み
- [ ] GitHub Secretsに全項目登録済み（`references/supabase-vercel-setup.md` の一覧参照）
- [ ] `sync-notion.yml` を `.github/workflows/` に配置し、テストPRで動作確認済み
- [ ] スキルセット一式を `docs/ai-hackathon-team-ops/` にコピーし、push済み

## ドキュメント共有

- [ ] Teamsで全員にREADME.mdへのリンクを共有した
- [ ] 全員がREADME.md / SKILL.md / ai-harness-core.md を読了した
- [ ] 各自の役割ファイル（agents/*.md）を読了した

## 環境確認（全員）

- [ ] 自分のGitHubアカウントでCollaborator招待を承諾済み
- [ ] WSL2 Ubuntuターミナルから `claude` を起動できることを確認済み
- [ ] Ubuntu上で `npm install` が成功することを確認済み
- [ ] `npm run dev` でローカル起動できることを確認済み
- [ ] Vercel Preview Deployのリンクを開いて動作確認済み

## コミュニケーション

- [ ] Teamsチャネルに全員参加済み
- [ ] 通知設定（PRマージ時の通知等）が有効になっている
- [ ] 緊急時の連絡手段（電話番号等）を交換済み（必要であれば）

## 当日の役割再確認

- [ ] 各自、自分の担当領域（frontend / backend / infra / qa）を認識している
- [ ] Sprint分割（0.5-8h / 8-15h / 15-20h）のスケジュール感を共有している

---

すべてチェックが完了したら、開発開始です。
