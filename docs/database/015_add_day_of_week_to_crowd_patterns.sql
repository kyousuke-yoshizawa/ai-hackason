-- 曜日次元を crowd_patterns に追加するマイグレーション
-- 作成日：2026年7月21日
-- 目的：Issue #99（混雑パターン設定グリッドUI＋曜日次元の追加, S002）
--       既存の crowd_patterns は「時間帯のみ」のフォールバックパターンだったが、
--       曜日ごとに異なる想定混雑度を設定できるようにする。
--
-- 互換性:
--   - day_of_week は NULL 許容。既存データ（007/008 で投入済みの時間帯のみパターン）は
--     day_of_week = NULL のまま「全曜日共通のフォールバック」として扱う
--     （backend/domains/crowd/repository.ts の getCrowdPattern が
--       「曜日一致 → 見つからなければ day_of_week IS NULL」の優先順位で参照する）。
--   - 0=日曜, 1=月曜, ..., 6=土曜（JS の Date.getDay() と同じ規約）。
--
-- ⚠️ 本ファイルは commit のみ。Supabase への適用はチームが手動で
--    ダッシュボード（SQL Editor）から行うこと（このセッションには
--    service_role 資格情報が無く、ライブDBへは接続していない）。

ALTER TABLE crowd_patterns
  ADD COLUMN IF NOT EXISTS day_of_week SMALLINT; -- 0=日曜〜6=土曜。NULL=全曜日共通（既存データ互換のフォールバック値）

-- 007/008 の CREATE TABLE は `UNIQUE (store_id, hour_of_day)` を無名で宣言しており、
-- Postgres のデフォルト命名規則では `crowd_patterns_store_id_hour_of_day_key` になる。
-- ただし環境によって命名がずれている可能性があるため、pg_constraint から
-- 実際の (store_id, hour_of_day) の一意制約名を動的に特定して DROP する。
DO $$
DECLARE
  existing_constraint_name TEXT;
BEGIN
  SELECT con.conname
    INTO existing_constraint_name
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
   WHERE rel.relname = 'crowd_patterns'
     AND con.contype = 'u'
     AND con.conkey = (
       SELECT array_agg(attnum ORDER BY attnum)
         FROM pg_attribute
        WHERE attrelid = rel.oid
          AND attname IN ('store_id', 'hour_of_day')
     )
   LIMIT 1;

  IF existing_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE crowd_patterns DROP CONSTRAINT %I', existing_constraint_name);
  END IF;
END $$;

ALTER TABLE crowd_patterns
  ADD CONSTRAINT crowd_patterns_store_day_hour_key UNIQUE (store_id, day_of_week, hour_of_day);

-- ⚠️ PostgreSQL の UNIQUE 制約は NULL 同士を「等しくない」ものとして扱うため、
-- 上記の複合 UNIQUE だけでは day_of_week = NULL（全曜日共通フォールバック）行の
-- 重複（同一 store_id, hour_of_day で複数行）を防げない。NULL 行専用の部分一意
-- インデックスで別途保証する。
CREATE UNIQUE INDEX IF NOT EXISTS crowd_patterns_store_hour_fallback_key
  ON crowd_patterns (store_id, hour_of_day)
  WHERE day_of_week IS NULL;

ALTER TABLE crowd_patterns
  ADD CONSTRAINT crowd_patterns_day_of_week_check CHECK (day_of_week IS NULL OR day_of_week BETWEEN 0 AND 6);

COMMENT ON COLUMN crowd_patterns.day_of_week IS '曜日（0=日曜〜6=土曜、JSのDate.getDay()と同じ規約）。NULL=全曜日共通のフォールバック';

CREATE INDEX IF NOT EXISTS idx_crowd_patterns_store_day_hour ON crowd_patterns(store_id, day_of_week, hour_of_day);
