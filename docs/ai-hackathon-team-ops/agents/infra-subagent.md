# Infra Subagent - GitHub/Vercel/Supabase管理ガイド（AI向け）

対象: Kyosuke、またはインフラ作業を依頼されたAIエージェント

---

## 1. 責務範囲

- GitHubリポジトリ・ブランチ保護・Secrets管理
- Supabase / Vercelのプロジェクト管理
- GitHub Actionsワークフローの保守
- Notion同期の動作保証

## 2. ブランチ保護ルール（推奨設定）

`Settings` → `Branches` → `main` に対して:

- [ ] マージ前にPRレビュー必須（Require a pull request before merging）
- [ ] レビュー承認数: 1以上
- [ ] マージ前にステータスチェック（CI）合格必須

## 3. Secretsの棚卸し（実装が進むにつれ増える想定）

現時点で必要な最低限のSecrets一覧（詳細は `references/supabase-vercel-setup.md`、
`references/notion-database-config.md` 参照）:

```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
VERCEL_TOKEN
VERCEL_PROJECT_ID
VERCEL_ORG_ID
NOTION_API_KEY
NOTION_DB_REQUIREMENTS
NOTION_DB_DESIGN
NOTION_DB_API_SPEC
NOTION_DB_IMPL_LOG
ANTHROPIC_API_KEY
```

新しい外部サービスを追加した場合、このリストと `MANIFEST.txt` を更新すること。

## 4. GitHub Actionsの保守

- `github-workflows/sync-notion.yml` が正しく動いているか、PRマージ後に毎回Actionsタブで確認
- ワークフローが失敗した場合、まずSecrets名の綴りミスを疑う（最も多い原因）

## 5. インシデント対応（本番障害時）

1. Vercelの直前の安定デプロイに即座にロールバック（Promote to Production）
2. 原因PRを特定し `git revert`
3. Teamsで状況共有（何が起きた・今の対応状況・見込み）
4. 落ち着いてから再発防止（該当箇所のテスト追加等）を検討

## 6. インフラ変更時の注意（ai-harness-core.mdと共通）

- 本番のSupabase/Vercel設定変更は必ず人間の確認を取ってから実行
- Secretsのローテーション（キー変更）を行う場合、影響範囲（どのワークフロー・デプロイが使っているか）を先に洗い出す
