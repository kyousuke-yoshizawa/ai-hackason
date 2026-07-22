-- プラン提案回数記録テーブル作成スクリプト
-- 作成日：2026年7月22日
-- 対象Issue: #136（店舗ダッシュボードにプラン提案回数を表示。S005拡張）
-- 目的：AIプラン生成（POST /api/plan/generate）が候補に含めた店舗ごとに、
--       いつ提案されたかを記録し、店舗ダッシュボードで「本日の提案回数」を
--       集計・表示できるようにする（backend/domains/stores/planSuggestions.ts参照）
--
-- ⚠️ 本ファイルは commit のみ。Supabase への適用はチームが手動で
--    ダッシュボード（SQL Editor）から行うこと（このセッションには
--    service_role 資格情報が無く、ライブDBへは接続していない）。

CREATE TABLE IF NOT EXISTS plan_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  suggested_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- backend/domains/stores/planSuggestions.ts の getSuggestionCounts() が
-- store_id群 × suggested_at >= 当日0時JST で絞り込むため、この複合列に対応する索引を張る
CREATE INDEX IF NOT EXISTS idx_plan_suggestions_store_date ON plan_suggestions (store_id, suggested_at);

COMMENT ON TABLE plan_suggestions IS 'AIプラン生成が候補に含めた店舗の提案履歴（Issue #136）。店舗ダッシュボードの提案回数表示に使う';
COMMENT ON COLUMN plan_suggestions.store_id IS '提案された店舗ID';
COMMENT ON COLUMN plan_suggestions.suggested_at IS '提案（プラン生成候補への採用）が記録された時刻';

-- ============================================================
-- 動作確認用クエリ
-- ============================================================
-- SELECT store_id, count(*) FROM plan_suggestions WHERE suggested_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Tokyo') AT TIME ZONE 'Asia/Tokyo' GROUP BY store_id;
