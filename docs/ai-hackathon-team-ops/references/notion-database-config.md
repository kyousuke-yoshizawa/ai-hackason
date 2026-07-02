# Notion Database 構成・APIセットアップ

対象: インフラリード（Kyosuke）

---

## 1. 作成する4つのデータベース

| DB名 | 用途 | 自動更新タイミング |
|---|---|---|
| 要件定義書 | 機能要件・仕様を記録 | Issue作成/更新時 |
| 設計書 | アーキテクチャ・DB設計等 | PRマージ時（設計関連の変更） |
| API仕様書 | エンドポイント一覧・入出力形式 | backend関連PRマージ時 |
| 実装ログ | 実装内容・変更履歴 | PRマージ時（全般） |

## 2. 各データベースの推奨プロパティ

### 要件定義書
- タイトル（Title）
- ステータス（Select: 未着手/対応中/完了）
- 関連Issue番号（Number or URL）
- 優先度（Select: High/Medium/Low）

### 設計書
- タイトル（Title）
- カテゴリ（Select: Frontend/Backend/DB/Infra）
- 最終更新日（Date, 自動）
- 関連PR（URL）

### API仕様書
- エンドポイント（Title、例: `POST /api/messages`）
- メソッド（Select: GET/POST/PUT/DELETE）
- リクエスト形式（Text）
- レスポンス形式（Text）
- 実装状況（Select）

### 実装ログ
- 日時（Date, 自動）
- PRタイトル（Title）
- 担当者（Person）
- 概要（Text）
- PRリンク（URL）

## 3. Integration作成手順

1. https://www.notion.so/my-integrations → 「New integration」
2. 名前: `ai-hackathon-sync`、対象ワークスペースを選択
3. Capabilities: `Read content`, `Update content`, `Insert content` にチェック
4. 発行された「Internal Integration Secret」を控える（`NOTION_API_KEY` としてGitHub Secretsに登録）

## 4. データベースへの接続

各データベースページを開き、右上「...」メニュー →「Connect to」→ `ai-hackathon-sync` を選択。
これを4つのDBすべてで行う。

## 5. Database IDの取得方法

データベースをフルページで開いたときのURL:

```
https://www.notion.so/ワークスペース名/1234567890abcdef1234567890abcdef?v=...
```

`1234567890abcdef1234567890abcdef` の32文字（ハイフンなし）がDatabase IDです。
4つ分それぞれ控え、GitHub Secretsに以下の名前で登録します。

- `NOTION_DB_REQUIREMENTS`
- `NOTION_DB_DESIGN`
- `NOTION_DB_API_SPEC`
- `NOTION_DB_IMPL_LOG`

## 6. 動作確認

Notion APIをcurlで簡易テストする例:

```bash
curl -X GET "https://api.notion.com/v1/databases/<DATABASE_ID>" \
  -H "Authorization: Bearer <NOTION_API_KEY>" \
  -H "Notion-Version: 2022-06-28"
```

200 OKでデータベース情報が返ってくれば接続成功です。

## 7. トラブルシューティング

| 症状 | 原因・対処 |
|---|---|
| `401 Unauthorized` | APIキーが間違っている、またはIntegrationがワークスペースに追加されていない |
| `404 Not Found` | Database IDが間違っている、またはそのDBにIntegrationが接続されていない |
| GitHub Actions実行後もNotionが更新されない | Actionsのログを確認し、`sync-notion.yml` のSecrets参照名が一致しているか確認 |
