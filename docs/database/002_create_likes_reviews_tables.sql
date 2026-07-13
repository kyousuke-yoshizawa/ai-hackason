-- いいね・レビュー機能 DBスキーマ作成スクリプト
-- 作成日：2026年7月13日
-- 目的：店舗への「いいね」とレビュー・評価を管理する
-- 対応Issue：#27 (いいね・レビュー-DBスキーマ&API実装), #29 (レビュー-DBスキーマ&API実装)
--
-- ⚠️ 前提条件：stores テーブルが作成済みであること（Issue #17 店舗マスタ担当：板垣）
--   stores テーブルの id は users.id と同様に UUID PRIMARY KEY を想定しています。
--   stores テーブルがまだ存在しない場合、本スクリプトの実行はエラーになります。

-- ============================================================
-- likes テーブル
-- ============================================================
CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, store_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_store_id ON likes(store_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);

COMMENT ON TABLE likes IS 'ユーザーの店舗いいね情報';
COMMENT ON COLUMN likes.user_id IS 'いいねしたユーザ';
COMMENT ON COLUMN likes.store_id IS 'いいねされた店舗';

-- ============================================================
-- reviews テーブル
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment VARCHAR(500),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_store_id ON reviews(store_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);

COMMENT ON TABLE reviews IS '店舗レビュー・評価';
COMMENT ON COLUMN reviews.rating IS '評価（1〜5）';
COMMENT ON COLUMN reviews.comment IS 'レビューコメント（最大500文字）';

-- ============================================================
-- review_stats テーブル（非正規化・集計キャッシュ）
-- ============================================================
CREATE TABLE IF NOT EXISTS review_stats (
  store_id UUID PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
  avg_rating NUMERIC(3, 2) NOT NULL DEFAULT 0,
  review_count INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE review_stats IS '店舗ごとのレビュー集計（avg_rating / review_count のキャッシュ）';

-- ============================================================
-- レビュー統計の自動更新トリガー
-- reviews の INSERT / UPDATE / DELETE のたびに review_stats を再計算する
-- ============================================================
CREATE OR REPLACE FUNCTION refresh_review_stats() RETURNS TRIGGER AS $$
DECLARE
  target_store_id UUID;
BEGIN
  target_store_id := COALESCE(NEW.store_id, OLD.store_id);

  INSERT INTO review_stats (store_id, avg_rating, review_count, last_updated)
  SELECT
    target_store_id,
    COALESCE(AVG(rating), 0),
    COUNT(*),
    NOW()
  FROM reviews
  WHERE store_id = target_store_id
  ON CONFLICT (store_id) DO UPDATE SET
    avg_rating = EXCLUDED.avg_rating,
    review_count = EXCLUDED.review_count,
    last_updated = EXCLUDED.last_updated;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reviews_stats_insert ON reviews;
CREATE TRIGGER trg_reviews_stats_insert
AFTER INSERT ON reviews
FOR EACH ROW EXECUTE FUNCTION refresh_review_stats();

DROP TRIGGER IF EXISTS trg_reviews_stats_update ON reviews;
CREATE TRIGGER trg_reviews_stats_update
AFTER UPDATE ON reviews
FOR EACH ROW EXECUTE FUNCTION refresh_review_stats();

DROP TRIGGER IF EXISTS trg_reviews_stats_delete ON reviews;
CREATE TRIGGER trg_reviews_stats_delete
AFTER DELETE ON reviews
FOR EACH ROW EXECUTE FUNCTION refresh_review_stats();
