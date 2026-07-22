-- stores テーブルへの属性カラム追加マイグレーション
-- 作成日：2026年7月22日
-- 対象Issue: #126（tags）, #127（closed_days）, #128（last_order_time）,
--            #129（description）, #130（sub_area）
-- 目的：プラン生成（backend/domains/plan）でタグ・定休日・L.O.・紹介文・
--       サブエリアを扱えるようにするための店舗マスタ拡張
--
-- ⚠️ 本ファイルは commit のみ。Supabase への適用はチームが手動で
--    ダッシュボード（SQL Editor）から行うこと（このセッションには
--    service_role 資格情報が無く、ライブDBへは接続していない）。

-- #126 tags: 自由入力の推奨語彙（例: '子連れOK','屋内','テラス席','テイクアウト可',
--            'デート向き','おひとりさま歓迎'）。要素数最大10・各要素最大20文字。
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE stores
  ADD CONSTRAINT chk_stores_tags_count CHECK (array_length(tags, 1) IS NULL OR array_length(tags, 1) <= 10);

-- 各要素の文字数制限は配列全体に対する CHECK では簡潔に書けないため、
-- 配列を展開したサブクエリで検証する
ALTER TABLE stores
  ADD CONSTRAINT chk_stores_tags_element_length CHECK (
    NOT EXISTS (SELECT 1 FROM unnest(tags) AS tag WHERE char_length(tag) > 20)
  );

-- #127 closed_days: 定休日。0=日曜〜6=土曜（JSのDate.getDay()と同じ規約、
--      crowd_patterns.day_of_week と揃える）。空配列=無休。要素数最大7。
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS closed_days SMALLINT[] NOT NULL DEFAULT '{}';

ALTER TABLE stores
  ADD CONSTRAINT chk_stores_closed_days_count CHECK (array_length(closed_days, 1) IS NULL OR array_length(closed_days, 1) <= 7);

ALTER TABLE stores
  ADD CONSTRAINT chk_stores_closed_days_range CHECK (
    NOT EXISTS (SELECT 1 FROM unnest(closed_days) AS d WHERE d < 0 OR d > 6)
  );

-- #128 last_order_time: ラストオーダー時刻。NULL=L.O.設定なし。
--      open_time/close_time と同じ TIME 型でバリデーション方式を揃える。
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS last_order_time TIME;

-- #129 description: 紹介文（100〜200字目安・世界観トーン）。最大500文字。
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE stores
  ADD CONSTRAINT chk_stores_description_length CHECK (description IS NULL OR char_length(description) <= 500);

-- #130 sub_area: エリア内の4区画のいずれか。NULL可（未分類）。
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS sub_area TEXT;

ALTER TABLE stores
  ADD CONSTRAINT chk_stores_sub_area CHECK (sub_area IS NULL OR sub_area IN ('駅前エリア', '商店街エリア', '公園エリア', '広場エリア'));

COMMENT ON COLUMN stores.tags IS '店舗タグ（自由入力、推奨語彙あり）。要素数最大10・各要素最大20文字';
COMMENT ON COLUMN stores.closed_days IS '定休日（0=日曜〜6=土曜、JSのDate.getDay()と同じ規約）。空配列=無休';
COMMENT ON COLUMN stores.last_order_time IS 'ラストオーダー時刻（HH:MM）。NULL=L.O.設定なし';
COMMENT ON COLUMN stores.description IS '紹介文（世界観トーン、最大500文字）';
COMMENT ON COLUMN stores.sub_area IS 'エリア内の区画（駅前エリア/商店街エリア/公園エリア/広場エリア）。NULL=未分類';

-- ============================================================
-- 動作確認用クエリ
-- ============================================================
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'stores';
-- SELECT name, tags, closed_days, last_order_time, description, sub_area FROM stores LIMIT 5;
