# GitHub & Git 初心者ガイド

対象: 全メンバー（GitHub初心者向け）

---

## 1. 最初に覚える5つのコマンド

```bash
git status          # 今の変更状況を確認
git add .            # 変更をステージに追加
git commit -m "メッセージ"   # コミット（変更を記録）
git push             # リモート（GitHub）に反映
git pull             # 最新の変更を取得
```

## 2. ブランチの基本

ブランチ = 作業用の「枝」。mainを汚さずに安全に作業するための仕組みです。

```bash
git checkout -b feature/login-form   # 新しいブランチを作成して移動
# ... 実装 ...
git add .
git commit -m "ログインフォームを実装"
git push origin feature/login-form   # 初回はorigin名を明示
```

### ブランチ命名ルール

| プレフィックス | 用途 |
|---|---|
| `feature/xxx` | 新機能追加 |
| `fix/xxx` | バグ修正 |
| `chore/xxx` | 設定変更・雑務 |

## 3. Ubuntu（WSL2）での基本フロー

1. Ubuntu ターミナルを開き、リポジトリのディレクトリに移動
2. `git checkout -b feature/xxx` でブランチ作成
3. コード編集
4. ターミナルで `git add . && git commit -m "説明"`
5. `git push origin feature/xxx`
6. GitHub上でPR作成（次のドキュメント参照）

## 4. よくあるトラブルと対処

### コミットし忘れて別ブランチに移動しようとしてエラーになる

```bash
git stash        # 変更を一時退避
git checkout main
git stash pop    # 退避した変更を戻す
```

### pushしたらエラー（remote に新しい変更がある）

```bash
git pull --rebase origin main
# コンフリクトが出たら該当ファイルを修正後
git add .
git rebase --continue
git push
```

### コミットメッセージを間違えた（まだpushしていない場合）

```bash
git commit --amend -m "正しいメッセージ"
```

### 間違えてmainブランチで作業してしまった

```bash
git branch feature/oops     # 今の変更を新ブランチにコピー
git checkout feature/oops
git checkout main
git reset --hard origin/main   # mainを元の状態に戻す
```

## 5. 用語集

| 用語 | 説明 |
|---|---|
| リポジトリ (repo) | プロジェクトのファイル一式を管理する場所 |
| クローン (clone) | リポジトリをローカルにコピーすること |
| コミット (commit) | 変更の記録・スナップショット |
| プッシュ (push) | ローカルの変更をGitHubに反映すること |
| プル (pull) | GitHub側の変更をローカルに取り込むこと |
| マージ (merge) | 複数のブランチの変更を1つに統合すること |
| コンフリクト (conflict) | 同じ箇所を複数人が編集して自動統合できない状態 |

## 6. 困ったら

1. `git status` で今の状態を必ず確認
2. 分からない状態で無理にコマンドを実行しない（特に `--force` 系）
3. Teamsで質問（スクリーンショット + `git status` の結果を貼ると解決が早い）
