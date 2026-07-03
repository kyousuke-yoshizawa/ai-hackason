# Notion 連携セットアップガイド

## 概要

GitHub の PR マージ時に Notion の「実装ログ」データベースに自動で記録するように設定します。

## セットアップ手順

### ステップ 1: Notion Workspace にアクセス

1. [Notion Home](https://www.notion.so) にアクセス
2. プロジェクト用 Workspace にログイン

### ステップ 2: Notion Integration を作成

1. [Notion Integrations](https://www.notion.so/my-integrations) にアクセス
2. 「**新しいインテグレーション**」ボタンをクリック
3. 以下の情報を入力：
   - **名前**：`AI Hackathon GitHub Sync`
   - **ロゴ**：GitHub アイコン（オプション）
4. 「**送信**」をクリック

### ステップ 3: Integration Capabilities を設定

1. 「**Capabilities**」タブをクリック
2. 以下を有効化：
   - ✅ **Read content**
   - ✅ **Insert content**
   - ✅ **Update content**
3. 「**Save**」をクリック

### ステップ 4: API キーをコピー

1. 「**Secrets**」タブをクリック
2. 「**Internal Integration Token**」の値をコピー
3. この値が `NOTION_API_KEY` になります

### ステップ 5: 実装ログデータベースを作成

#### 5.1 Notion で新しいページを作成

1. Notion Workspace で新しいページを作成
2. ページ名：**実装ログ**

#### 5.2 データベーステーブルを作成

ページ内で「**+ 新規**」→「**データベース**」→「**テーブル**」をクリック

#### 5.3 カラムを設定

以下のカラムを作成してください：

| カラム名 | 型 | 説明 |
|---------|-----|------|
| **PRタイトル** | Title | PR のタイトル（プライマリ） |
| **担当者** | Text | GitHub ユーザ名 |
| **PRリンク** | URL | PR への直接リンク |
| **日時** | Date | マージ日時 |
| **ステータス** | Select | 実装状況（未確認/確認中/完了） |

### ステップ 6: データベース ID を取得

1. 実装ログデータベースの URL をコピー
   - 例：`https://www.notion.so/XXXXXXXXXXXXXXXXXXXXXXXX?v=YYYYYYYYYYYYYYYYYYYYYYYY`

2. `?v=` の前の部分が Database ID です
   - 例：`XXXXXXXXXXXXXXXXXXXXXXXX` が DB ID

3. この値が `NOTION_DB_IMPL_LOG` になります

### ステップ 7: Integration を Database に接続

1. データベースのメニュー（右上の「⋯」）をクリック
2. 「**接続を追加**」をクリック
3. 作成した Integration「AI Hackathon GitHub Sync」を選択
4. アクセス権を確認して「**接続**」をクリック

### ステップ 8: GitHub Secrets に登録

1. GitHub リポジトリを開く
2. **Settings** → **Secrets and variables** → **Actions** をクリック
3. 「**New repository secret**」をクリック
4. 以下の 2 つを追加：

**Secret 1:**
```
Name: NOTION_API_KEY
Value: [ステップ 4 でコピーした Integration Token]
```

**Secret 2:**
```
Name: NOTION_DB_IMPL_LOG
Value: [ステップ 6 で取得した Database ID]
```

5. 「**Add secret**」をクリック

## ✅ セットアップ確認

### 確認方法

1. テスト用 PR を作成します
2. PR を **main ブランチにマージ** します
3. GitHub Actions が実行されます（Sync Notion on PR Merge）
4. Notion の「実装ログ」データベースに新しい行が追加されるか確認

### 実装ログの確認

1. Notion で「実装ログ」データベースを開く
2. 最新の行に以下が記録されていることを確認：
   - **PRタイトル**：PR のタイトル
   - **担当者**：GitHub ユーザ名
   - **PRリンク**：GitHub PR へのリンク

## 🔧 トラブルシューティング

### エラー：「Notion同期に失敗しました」

**原因**：Secrets が正しく設定されていない

**対応**：
1. GitHub Secrets を確認
2. Integration Token と Database ID が正確か確認
3. Notion Integration に Database へのアクセス権があるか確認

### エラー：「401 Unauthorized」

**原因**：Integration Token が無効

**対応**：
1. Notion Integrations ページで Integration を確認
2. Token を再生成
3. GitHub Secrets を更新

### データベースに記録されない

**原因**：Database ID が間違っている

**対応**：
1. Notion で実装ログ Database の URL を確認
2. Database ID を正確にコピー
3. GitHub Secrets を更新

## 📊 Notion データベース拡張

### カラムの追加例

今後以下のカラムを追加すると便利です：

| カラム名 | 型 | 説明 |
|---------|-----|------|
| **機能分類** | Select | 機能/バグ修正/リファクタ など |
| **影響範囲** | Multi-select | フロント/バック/DB など |
| **実装者** | Person | チームメンバーの関連付け |
| **レビュー者** | Person | PR レビュアー |
| **テスト状況** | Select | 未テスト/テスト中/完了 |
| **備考** | Text | 補足情報 |

### Notion のビュー設定

実装ログを見やすくするため、Notion で以下のビューを作成：

1. **タイムラインビュー**：実装日時の推移を視覚化
2. **ステータスボード**：進捗状況を一覧表示
3. **担当者別フィルタ**：担当者ごとの実装内容を表示

## 🔐 セキュリティに関する注意

- ⚠️ Integration Token は **絶対に公開しない**
- ⚠️ Git コミットに Token を含めない
- ⚠️ GitHub Secrets は表示されません（安全）
- ⚠️ Token が漏洩した場合は、Notion で即座に再生成

---

**作成日**：2026年7月3日
**作成者**：吉沢
