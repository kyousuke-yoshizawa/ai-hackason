# PR作成〜マージ完全フロー

対象: 全メンバー + Kyosuke（マージ承認者）

---

## 0. ローカル開発フロー（開発者向け）

実装から PR 作成までの詳細ステップ：

```
git pull → ブランチ切る → こまめにコミット → 自レビュー → 問題あれば修正
  ↓
git push → PR作成 → AIレビュー → 修正＆再レビュー → マージ
```

### 0-1. 作業開始前

```bash
# 最新の main を取得
git pull origin main

# 自分のブランチを切る（例: feature/yoshizawa）
git checkout -b feature/yoshizawa
```

### 0-2. 修正・コミット（何度も繰り返す）

```bash
# ファイルを編集...

# 変更をステージング
git add <修正ファイル>

# コミット（こまめに履歴を残す）
git commit -m "修正内容を簡潔に記載（日本語OK）"

# さらに修正が必要なら、また編集 → add → commit
```

**ポイント**:
- コミットは**こまめに** — 1つの機能・バグ修正で1コミット
- コミットメッセージは簡潔に（例: `ログインフォーム UI実装`）
- `git log` で確認

### 0-3. 自レビュー

```bash
# 変更内容を確認
git diff HEAD~5  # 直近5コミットの差分を見る

# または VSCode で変更を確認
code .
```

**チェックリスト**:
- [ ] 動作確認済みか（`npm run dev` で確認）
- [ ] Secrets/APIキーをハードコードしていないか
- [ ] 不要な `console.log` やコメント残っていないか
- [ ] 型チェック通っているか（`npm lint`）

### 0-4. 修正またはコミット

- 問題があれば、ファイルを修正 → `git add` → `git commit`
- 問題なければ、次のステップへ

### 0-5. push

ある程度コミットが溜まったら（通常は機能単位で3〜5コミット程度）：

```bash
git push -u origin feature/<name>
```

---

## 1. 全体の流れ

```
ローカル開発完了（push 済み） → PR作成 → AIレビュー依頼 → AI レビュー → 修正（あれば） → AI 承認 → マージ → 自動デプロイ・Notion同期
```

## 2. PR作成手順

1. GitHubリポジトリのページで「Pull requests」→「New pull request」
2. base: `main` ← compare: 自分の作業ブランチ（例: `feature/yoshizawa`）
3. タイトル: 何をしたか一目でわかるように（例: `ログインフォームのUI実装`）
4. 説明欄には以下のテンプレートを使う

```markdown
## 変更内容
- 何を実装/修正したか

## 関連Issue
Closes #番号

## 動作確認
- [ ] ローカル（WSL2 Ubuntu）で動作確認済み
- [ ] Vercel Preview Deployで確認済み

## レビューしてほしいポイント
- 特に見てほしい箇所があれば記載
```

5. 右側の「Reviewers」で AI レビューサブエージェント（詳細は次のセクション参照）を指定
6. 「Create pull request」

### 2-B. CLI（`gh`）を使った PR 作成・マージ

**前提**: GitHub CLI (`gh`) がインストールされていること

```bash
# gh のインストール（初回のみ）
# Ubuntu/Debian:
sudo apt-get install gh

# または手動インストール:
cd /tmp
curl -L https://github.com/cli/cli/releases/download/v2.52.0/gh_2.52.0_linux_amd64.tar.gz -o gh.tar.gz
tar xzf gh.tar.gz
/tmp/gh_2.52.0_linux_amd64/bin/gh --version

# GitHub 認証（初回のみ）
gh auth login
# または環境変数で認証:
export GH_TOKEN="ghp_your-personal-access-token"
gh auth status  # 確認

# PR 作成
gh pr create \
  --title "PR のタイトル（日本語可）" \
  --body "PR の説明"

# PR マージ
gh pr merge <PR番号> --merge
```

**注意**:
- `GH_TOKEN` は GitHub 設定 → [Personal access tokens](https://github.com/settings/tokens) で生成できます
- スコープは `repo` と `workflow` が必須です
- トークンを環境変数で設定する場合、`.bashrc` や `.zshrc` に記載せず、使用時のみ `export` してください

### 2-C. AIレビュー依頼とレビュー修正サイクル

PR 作成後、以下のフローを回す：

1. **AIレビュー依頼**
   - PR に対して、`/code-review` を実行（またはレビュー専用 AI サブエージェント）
   - **重要**: 自分自身でレビューしない — 必ず AI サブエージェントに依頼する

2. **AIレビュー結果を確認**
   - AI からレビューコメントが PR に付く
   - 指摘内容を確認

3. **修正 or スキップの判断**
   - **指摘あり** → ローカルで修正 → コミット → push
   - **指摘なし** → 次のステップへ

4. **再レビュー（指摘あった場合）**
   - push 後、再び `/code-review` 実行
   - 指摘がなくなるまでこのサイクルを繰り返す

5. **マージ**
   - AI からの承認（Approve）が付いたら、Kyosuke または 指定マージ者がマージ

**ポイント**:
- レビューサイクルは「指摘がなくなるまで」繰り返す
- 1回の AI レビューで完璧を目指さない — 小分けにして何度も回す方が効率的
- AI の指摘は「強い要求」と「提案」を区別し、対応判断する

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
