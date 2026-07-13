# いいね・レビュー機能（likes / reviews / review_stats）

対応Issue：#27（いいね・レビュー-DBスキーマ&API実装）、#28（いいね-UI実装）、#29（レビュー-DBスキーマ&API実装）、#30（レビュー-UI実装）

## ⚠️ 前提条件

`stores` テーブルが作成済みであること（Issue #17、担当：板垣）。本スキーマの `store_id` はすべて `stores(id)` への外部キーです。`stores` テーブルが存在しない状態で `002_create_likes_reviews_tables.sql` を実行するとエラーになります。

## テーブル定義

### likes

| カラム名 | データ型 | 制約 | 説明 |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY | いいねID |
| `user_id` | UUID | NOT NULL, FK → users(id) | いいねしたユーザ |
| `store_id` | UUID | NOT NULL, FK → stores(id) | いいねされた店舗 |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | 作成日時 |

`UNIQUE(user_id, store_id)` により同一ユーザーの重複いいねを防止。

### reviews

| カラム名 | データ型 | 制約 | 説明 |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY | レビューID |
| `user_id` | UUID | NOT NULL, FK → users(id) | 投稿者 |
| `store_id` | UUID | NOT NULL, FK → stores(id) | 対象店舗 |
| `rating` | SMALLINT | NOT NULL, CHECK 1〜5 | 評価 |
| `comment` | VARCHAR(500) | – | コメント（最大500文字） |
| `created_at` / `updated_at` | TIMESTAMP | NOT NULL | 作成・更新日時 |

### review_stats（非正規化・集計キャッシュ）

| カラム名 | データ型 | 説明 |
|---|---|---|
| `store_id` | UUID (PK, FK → stores(id)) | 対象店舗 |
| `avg_rating` | NUMERIC(3,2) | 平均評価 |
| `review_count` | INTEGER | レビュー件数 |
| `last_updated` | TIMESTAMP | 最終更新日時 |

`reviews` への INSERT/UPDATE/DELETE 時にトリガー（`refresh_review_stats`）が自動的に集計し直すため、アプリケーション側で統計値を手動更新する必要はありません。

## フロントエンドからの利用

Expressバックエンドは存在しないため、`docs`内の他実装（`src/lib/supabase.ts`）と同様に **Supabaseクライアントから直接テーブル操作**する方式を採用しています。

- いいね操作：`src/lib/likes.ts`
- レビュー操作：`src/lib/reviews.ts`
- UIコンポーネント：`src/components/LikeButton.tsx`, `src/components/StarRating.tsx`, `src/components/ReviewFormModal.tsx`, `src/components/ReviewList.tsx`, `src/components/StoreReviewSection.tsx`
- いいね一覧ページ：`src/pages/LikesListPage.tsx`

### 店舗詳細画面への組み込みについて

店舗詳細画面・プラン提案画面（Issue #17/#19 で作成予定）がまだ存在しないため、`StoreReviewSection` はその画面ができ次第 `storeId` を渡して組み込む想定の独立コンポーネントとして実装しています。

## 実装手順

1. Supabase ダッシュボード → SQL Editor で `002_create_likes_reviews_tables.sql` を実行（`stores` テーブル作成後）
2. Table Editor で `likes` / `reviews` / `review_stats` が作成されていることを確認
3. レビューを1件INSERTし、`review_stats` が自動更新されることを確認

---

**作成日**：2026年7月13日
**作成者**：高柳
