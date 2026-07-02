# PR作成〜マージ完全フロー

対象: 全メンバー + Kyosuke（マージ承認者）

---

## 1. 全体の流れ

```
実装完了 → push → PR作成 → レビュー依頼 → レビュー → 修正（あれば） → 承認 → マージ → 自動デプロイ・Notion同期
```

## 2. PR作成手順

1. GitHubリポジトリのページで「Pull requests」→「New pull request」
2. base: `main` ← compare: 自分の作業ブランチ（例: `feature/login-form`）
3. タイトル: 何をしたか一目でわかるように（例: `ログインフォームのUI実装`）
4. 説明欄には以下のテンプレートを使う

```markdown
## 変更内容
- 何を実装/修正したか

## 関連Issue
Closes #番号

## 動作確認
- [ ] ローカル（Codespaces）で動作確認済み
- [ ] Vercel Preview Deployで確認済み

## レビューしてほしいポイント
- 特に見てほしい箇所があれば記載
```

5. 右側の「Reviewers」でKyosuke（またはreviewer-subagent.mdに従うレビュアー）を指定
6. 「Create pull request」

## 3. レビューの基準（reviewer-subagent.md と共通）

- [ ] コードが動く（Vercel Preview Deployで確認できる場合はそちらも見る）
- [ ] Secrets/APIキーがハードコードされていない
- [ ] 明らかに不要なconsole.logやコメントアウトが残っていない
- [ ] 命名・ディレクトリ構成が既存のプロジェクト構成と大きくずれていない
- [ ] 破壊的変更（DBスキーマ変更等）がある場合、事前に共有されているか

## 4. レビューコメントの付け方

- 必須の修正: `[必須]` を先頭につける
- 任意・提案レベル: `[任意]` または `nit:` を先頭につける
- 良い点も積極的にコメントする（心理的安全性のため）

## 5. マージの手順（Kyosuke担当）

1. レビューで承認（Approve）が付いていることを確認
2. CI（GitHub Actions）が通っていることを確認（赤い×マークがないか）
3. マージ方法は原則 **Squash and merge**（コミット履歴を綺麗に保つため）
4. マージ後、Teamsに自動通知が飛ぶことを確認
5. Vercelの自動デプロイが成功しているか確認（Vercelダッシュボード）

## 6. コンフリクト解消

PRページに "This branch has conflicts" と出た場合:

```bash
git checkout feature/xxx
git fetch origin
git merge origin/main
# コンフリクト箇所を手動で修正（<<<<<<< と >>>>>>> の間を編集）
git add .
git commit -m "mainとのコンフリクトを解消"
git push
```

## 7. 緊急時（本番が壊れた場合）

1. Vercelダッシュボード → 「Deployments」→ 直前の正常なデプロイを「Promote to Production」
2. 原因となったPRのコミットをrevert

```bash
git revert <コミットハッシュ>
git push
```

3. Teamsで状況を共有し、Kyosukeに連絡
