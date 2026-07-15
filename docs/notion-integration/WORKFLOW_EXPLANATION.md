# Notion 連携ワークフロー説明

## ワークフロー概要

ファイル：`.github/workflows/sync-notion.yml`

## トリガー条件

```yaml
on:
  pull_request:
    types: [closed]          # PR がクローズされた時
    branches: [main]         # main ブランチへのマージ
```

**つまり**：main ブランチへの PR がマージされた時に自動実行

## 実行フロー

```
1. PR が main にマージされる
   ↓
2. GitHub Actions が自動トリガー
   ↓
3. 「Checkout」ステップで最新コードを取得
   ↓
4. 「Post to Notion」ステップで Notion API を呼び出し
   ↓
5. Notion の「実装ログ」データベースに新しい行を追加
   ↓
6. 成功 or 失敗をログに記録
```

## ワークフローのステップ

### ステップ 1: Checkout

```yaml
- name: Checkout
  uses: actions/checkout@v4
```

最新のコードを取得します（今は使用していませんが、将来の拡張用）

### ステップ 2: Post to Notion（実装ログDB）

```yaml
- name: Post to Notion (実装ログDB)
  env:
    NOTION_API_KEY: ${{ secrets.NOTION_API_KEY }}
    NOTION_DB_IMPL_LOG: ${{ secrets.NOTION_DB_IMPL_LOG }}
    PR_TITLE: ${{ github.event.pull_request.title }}
    PR_URL: ${{ github.event.pull_request.html_url }}
    PR_AUTHOR: ${{ github.event.pull_request.user.login }}
    PR_BODY: ${{ github.event.pull_request.body }}
```

**環境変数**：

| 変数名 | 取得元 | 説明 |
|--------|--------|------|
| `NOTION_API_KEY` | GitHub Secrets | Notion API キー |
| `NOTION_DB_IMPL_LOG` | GitHub Secrets | Notion Database ID |
| `PR_TITLE` | GitHub webhook | PR のタイトル |
| `PR_URL` | GitHub webhook | PR への直接リンク |
| `PR_AUTHOR` | GitHub webhook | PR を作成したユーザ名 |
| `PR_BODY` | GitHub webhook | PR の説明文 |

**API 呼び出し**：

```bash
curl -X POST "https://api.notion.com/v1/pages" \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json" \
  --data @- << JSON
{
  "parent": { "database_id": "$NOTION_DB_IMPL_LOG" },
  "properties": {
    "PRタイトル": {
      "title": [ { "text": { "content": "$PR_TITLE" } } ]
    },
    "担当者": {
      "rich_text": [ { "text": { "content": "$PR_AUTHOR" } } ]
    },
    "PRリンク": {
      "url": "$PR_URL"
    }
  }
}
JSON
```

Notion API を使用して、指定のデータベースに新しいページを作成します

### ステップ 3: Notify on failure

```yaml
- name: Notify on failure
  if: failure()
  run: echo "Notion同期に失敗しました..."
```

失敗時にメッセージを表示します

## Notion データベース構造

### 作成されるデータベースページ

```
データベース: 実装ログ

新しいページ
├─ PRタイトル: "ログイン機能とダッシュボード画面を実装"
├─ 担当者: "yoshizawa"
├─ PRリンク: "https://github.com/kyousuke-yoshizawa/ai-hackason/pull/7"
└─ [その他のカラム]: （手動で追記可能）
```

## 実行ログの確認

### GitHub Actions で確認

1. GitHub リポジトリ → **Actions** タブ
2. 「**Sync Notion on PR Merge**」をクリック
3. 最新の実行結果を確認
4. 「**Post to Notion**」ステップをクリックで詳細ログを表示

### ログの見方

**成功時**：
```
HTTP/1.1 200 OK
```

**失敗時**：
```
HTTP/1.1 401 Unauthorized
または
HTTP/1.1 404 Not Found
```

## カスタマイズ例

### 追加情報を記録したい場合

`sync-notion.yml` の `properties` セクションを編集：

```yaml
"properties": {
  "PRタイトル": { ... },
  "担当者": { ... },
  "PRリンク": { ... },
  "PR説明": {
    "rich_text": [ { "text": { "content": "$PR_BODY" } } ]
  },
  "実装日時": {
    "date": { "start": "$(date -u +%Y-%m-%dT%H:%M:%SZ)" }
  }
}
```

### 条件付き実行

特定のブランチのみ実行：

```yaml
if: github.event.pull_request.merged && contains(github.event.pull_request.labels.*.name, 'deployed')
```

## トラブルシューティング

### ワークフローが実行されない

**確認項目**：
1. PR が main ブランチにマージされたか
2. GitHub Actions が有効化されているか
3. Secrets が正しく設定されているか

### Notion に記録されない

**確認項目**：
1. `NOTION_API_KEY` が有効か
2. `NOTION_DB_IMPL_LOG` が正確か
3. Integration に Database へのアクセス権があるか

### API エラーが出る

**確認項目**：
1. Notion API バージョン（2022-06-28）が最新か
2. Database ID の形式が正確か（ハイフンなし）
3. Token が有効期限内か

---

**作成日**：2026年7月3日
**作成者**：吉沢
