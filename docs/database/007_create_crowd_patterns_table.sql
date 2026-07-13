-- 混雑パターン（事前設定フォールバック）テーブル作成スクリプト
-- 作成日：2026年7月13日
-- 目的：Issue #26（混雑通知-リアルタイム混雑表示）で、直近30分以内の
--       リアルタイム報告（crowd_status）が無い場合のフォールバックとして
--       時間帯ごとの想定混雑度を参照するためのテーブル。
--
-- ⚠️ issue本文では「crowd_snapshots」という新テーブルが指定されていますが、
--    #24/#25 で既に導入済みの crowd_status（最新状態）/ crowd_history（履歴）が
--    同じ目的を果たすため、そちらを再利用します（詳細は PR 本文を参照）。
--    本ファイルはそれらに無い「事前設定パターン（crowd_patterns）」のみを追加します。

CREATE TABLE IF NOT EXISTS crowd_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  hour_of_day INTEGER NOT NULL CHECK (hour_of_day BETWEEN 0 AND 23),
  level TEXT NOT NULL CHECK (level IN ('low', 'medium', 'high')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, hour_of_day)
);

CREATE INDEX IF NOT EXISTS idx_crowd_patterns_store_hour ON crowd_patterns(store_id, hour_of_day);

COMMENT ON TABLE crowd_patterns IS '店舗ごとの時間帯別・想定混雑度（リアルタイム報告が無い場合のフォールバック）';
COMMENT ON COLUMN crowd_patterns.store_id IS '対象店舗ID';
COMMENT ON COLUMN crowd_patterns.hour_of_day IS '時刻（0-23時）';
COMMENT ON COLUMN crowd_patterns.level IS '想定混雑度（low/medium/high）';
