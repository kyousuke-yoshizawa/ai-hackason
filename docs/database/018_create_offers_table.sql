-- オファー（時間帯別割引・特典）テーブル作成スクリプト
-- 作成日：2026年7月22日
-- 対象Issue: #98（オファー機能の実装。要件定義書v2 S004）
-- 目的：店舗が時間帯別のオファー（例:「14-16時は狙い目！20%OFF」）を設定し、
--       AIプラン生成（backend/domains/plan）のスコアリング・プロンプトに反映できるようにする
--       （scoring.ts の OFFER_BONUS = 0.15 は本テーブル追加前から定義済みだったが、
--       hasOffer が常にfalse固定のため不活性だった）
--
-- ⚠️ 本ファイルは commit のみ。Supabase への適用はチームが手動で
--    ダッシュボード（SQL Editor）から行うこと（このセッションには
--    service_role 資格情報が無く、ライブDBへは接続していない）。

CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  weekdays_only BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_offers_time_range CHECK (start_time < end_time)
);

CREATE INDEX IF NOT EXISTS idx_offers_store_id ON offers(store_id);

-- backend/domains/offers/repository.ts の listActiveOffers()（プラン生成が全店舗分を
-- 一括取得する。#105のN+1回避パターンに合わせる）が is_active = true で全件走査するため
CREATE INDEX IF NOT EXISTS idx_offers_active ON offers(is_active) WHERE is_active = true;

COMMENT ON TABLE offers IS '店舗の時間帯別オファー（要件定義書v2 S004）。AIプラン生成のスコアリング・プロンプトに反映される';
COMMENT ON COLUMN offers.store_id IS '対象店舗ID';
COMMENT ON COLUMN offers.description IS 'オファー内容（例:「14-16時は狙い目！20%OFF」）';
COMMENT ON COLUMN offers.start_time IS '適用開始時刻（例 14:00）';
COMMENT ON COLUMN offers.end_time IS '適用終了時刻（例 16:00）。start_time より後である必要がある';
COMMENT ON COLUMN offers.weekdays_only IS '平日（月〜金）限定フラグ';
COMMENT ON COLUMN offers.is_active IS 'オファーの有効/無効。falseの場合はプラン生成に反映されない';

-- ============================================================
-- 動作確認用クエリ
-- ============================================================
-- SELECT id, store_id, description, start_time, end_time, weekdays_only, is_active FROM offers LIMIT 5;
