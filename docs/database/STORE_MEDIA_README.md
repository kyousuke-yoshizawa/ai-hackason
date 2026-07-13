# 店舗メディア添付機能（store_media）

対応Issue：#35（Store Media Attachment DB & API）、#36（Store Media Attachment UI）

## 前提条件

- `stores` テーブルが作成済みであること（Issue #17）
- Supabase Storage に `store-media` バケットを作成済みであること（Public: true）
  - SQLでは作成できないため、Supabaseダッシュボード → Storage から手動作成する

## テーブル定義

### store_media

| カラム名 | データ型 | 制約 | 説明 |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY | メディアID |
| `store_id` | UUID | NOT NULL, FK → stores(id) ON DELETE CASCADE | 添付先店舗 |
| `media_type` | VARCHAR(20) | NOT NULL, CHECK ('image'\|'document') | 種別（アップロード時のMIMEタイプから自動判定） |
| `file_path` | TEXT | NOT NULL | Supabase Storage上のパス（`store-media`バケット内） |
| `file_name` | VARCHAR(255) | NOT NULL | 元ファイル名 |
| `file_size` | INTEGER | – | ファイルサイズ（バイト） |
| `mime_type` | VARCHAR(100) | – | MIMEタイプ |
| `created_by` | UUID | NOT NULL, FK → users(id) | アップロードしたユーザ |
| `created_at` / `updated_at` | TIMESTAMP | NOT NULL | 作成・更新日時 |

## API（Express: `server/routes/storeMedia.ts`）

既存の `server/routes/stores.ts` と同じExpressバックエンド・`x-user-id`ヘッダ認証・`requireAdminOrStoreManager`権限チェックの仕組みに統一。

| エンドポイント | メソッド | 権限 | 説明 |
|---|---|---|---|
| `/api/stores/:storeId/media` | POST | admin または対象店舗の store_manager | ファイルアップロード（multipart/form-data, フィールド名 `file`、最大10MB） |
| `/api/stores/:storeId/media` | GET | 誰でも（店舗一覧/詳細と同様に公開） | ファイル一覧取得（`url`に公開URLを含む） |
| `/api/stores/:storeId/media/:mediaId` | DELETE | admin または対象店舗の store_manager | ファイル削除（Storageの実体・DB行の両方を削除） |

Issue #35の要件は「adminのみ」だが、実際のRBAC（`store_manager`が自店舗を編集できる、`server/middleware/auth.ts`の`requireAdminOrStoreManager`）と一貫性を持たせるため、店舗編集(`PUT /api/stores/:id`)と同じ権限モデルに揃えている。

## フロントエンド

- `src/lib/storeMedia.ts`：`getStoreMedia` / `uploadStoreMedia` / `deleteStoreMedia`
- `src/components/StoreMediaPanel.tsx`：ドラッグ&ドロップ対応のアップロードUI（管理画面の店舗一覧「メディア管理」から開く）
- 組み込み先：`src/components/StoreManagementPanel.tsx`（`AdminPage` は `user.role === 'admin'` のみ到達可能なため、UI上も実質admin限定になっている）

## テスト

`tests/integration/api-store-media.test.ts`（supertest + `tests/testUtils/fakeSupabase.ts`）で以下を検証：

- TC_301_1: admin / 自店舗のstore_managerとしてのアップロード成功
- TC_301_2: 権限なし（他店舗のstore_manager・一般ユーザ）は403
- TC_301_3: 存在しないstore_idへのアップロード・一覧取得は404
- TC_301_4: 同一店舗内の複数ファイル一覧取得
- 削除の正常系・権限エラー・404

`fakeSupabase.ts` に `.is()` フィルタと `.storage`（upload/remove/getPublicUrl）の簡易モックを追加している（既存テストへの影響はなし、追加のみ）。

---

**作成日**：2026年7月13日
**作成者**：高柳
