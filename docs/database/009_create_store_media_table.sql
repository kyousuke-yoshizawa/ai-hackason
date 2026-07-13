-- 店舗メディア添付テーブル作成スクリプト
-- 対象Issue: #35 [Feature] Store Media Attachment DB & API
-- 作成日：2026年7月13日
-- 目的：店舗マスタ情報に画像・ファイルを添付できるようにする

-- ============================================================
-- 1. store_media テーブル新規作成
-- ============================================================
CREATE TABLE IF NOT EXISTS store_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('image', 'document')),
  file_path TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE store_media IS '店舗に添付された画像・ファイルのメタデータ（実体はSupabase Storageに保存）';
COMMENT ON COLUMN store_media.store_id IS '添付先の店舗ID';
COMMENT ON COLUMN store_media.media_type IS 'image または document';
COMMENT ON COLUMN store_media.file_path IS 'Supabase Storage上のパス（store-media バケット内）';
COMMENT ON COLUMN store_media.file_name IS 'アップロード時の元ファイル名';
COMMENT ON COLUMN store_media.file_size IS 'ファイルサイズ（バイト）';
COMMENT ON COLUMN store_media.mime_type IS 'MIMEタイプ';
COMMENT ON COLUMN store_media.created_by IS 'アップロードした管理者/店舗責任者（users.id）';

CREATE INDEX IF NOT EXISTS idx_store_media_store_id ON store_media(store_id);

-- ============================================================
-- 2. Supabase Storage バケット
-- ============================================================
-- ⚠️ バケットの作成はSQLではなくSupabaseダッシュボード（Storage）または
--   Storage管理APIから行う必要がある。以下の設定で作成すること。
--
--   バケット名: store-media
--   Public: true（file_path から直接公開URLを組み立てて店舗詳細画面に表示するため）
--
--   アップロード/削除はバックエンド（server/routes/storeMedia.ts）が
--   service role key 経由で行うため、バケット自体のRLS/ポリシー設定は不要。

-- ============================================================
-- 3. 動作確認用クエリ
-- ============================================================
-- TC_301_1: アップロード成功後の確認
-- SELECT * FROM store_media WHERE store_id = '<store_id>';

-- TC_301_4: 同一店舗内の複数ファイル管理
-- SELECT store_id, COUNT(*) FROM store_media GROUP BY store_id;
