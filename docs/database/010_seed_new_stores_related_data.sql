-- 009 で追加した新規6店舗に紐づく関連テーブルへのテストデータ投入
-- 作成日：2026年7月15日
-- 対象店舗（009_seed_additional_stores_with_photos.sql で作成）：
--   004 麺屋 一福 / 005 ふわふわパン工房 / 006 はなよし花店
--   007 本の森書店 / 008 酒場つばめ / 009 ひなた雑貨店
--
-- 実行方法：Supabase ダッシュボード > SQL Editor に貼り付けて実行してください（1回のみ実行想定）。
-- べき等性：store_managers / crowd_status / crowd_analytics / crowd_patterns / likes は
--          一意制約があるため ON CONFLICT DO NOTHING で再実行してもエラー・重複になりません。
--          crowd_history / reviews / reservations は一意制約を持たないため、
--          再実行すると行が重複します（複数回実行しないでください）。

-- ============================================================
-- store_managers（一部の店舗にのみ担当者を割り当て、実際の運用らしさを出す）
-- ============================================================
INSERT INTO store_managers (store_id, manager_id)
SELECT '10000000-0000-4000-8000-000000000004', u.id FROM users u WHERE u.email = 'satoh@ai-hackason.example'
ON CONFLICT (store_id, manager_id) DO NOTHING;

INSERT INTO store_managers (store_id, manager_id)
SELECT '10000000-0000-4000-8000-000000000006', u.id FROM users u WHERE u.email = 'itagaki@ai-hackason.example'
ON CONFLICT (store_id, manager_id) DO NOTHING;

INSERT INTO store_managers (store_id, manager_id)
SELECT '10000000-0000-4000-8000-000000000008', u.id FROM users u WHERE u.email = 'takayanagi@ai-hackason.example'
ON CONFLICT (store_id, manager_id) DO NOTHING;

-- ============================================================
-- crowd_status（各店舗1件・現在の混雑度）
-- ============================================================
INSERT INTO crowd_status (store_id, level, updated_by)
SELECT '10000000-0000-4000-8000-000000000004', 'high', u.id FROM users u WHERE u.email = 'satoh@ai-hackason.example'
ON CONFLICT (store_id) DO NOTHING;

INSERT INTO crowd_status (store_id, level, updated_by)
SELECT '10000000-0000-4000-8000-000000000005', 'low', u.id FROM users u WHERE u.email = 'itagaki@ai-hackason.example'
ON CONFLICT (store_id) DO NOTHING;

INSERT INTO crowd_status (store_id, level, updated_by)
SELECT '10000000-0000-4000-8000-000000000006', 'medium', u.id FROM users u WHERE u.email = 'itagaki@ai-hackason.example'
ON CONFLICT (store_id) DO NOTHING;

INSERT INTO crowd_status (store_id, level, updated_by)
SELECT '10000000-0000-4000-8000-000000000007', 'low', u.id FROM users u WHERE u.email = 'takayanagi@ai-hackason.example'
ON CONFLICT (store_id) DO NOTHING;

INSERT INTO crowd_status (store_id, level, updated_by)
SELECT '10000000-0000-4000-8000-000000000008', 'high', u.id FROM users u WHERE u.email = 'takayanagi@ai-hackason.example'
ON CONFLICT (store_id) DO NOTHING;

INSERT INTO crowd_status (store_id, level, updated_by)
SELECT '10000000-0000-4000-8000-000000000009', 'medium', u.id FROM users u WHERE u.email = 'yoshizawa@ai-hackason.example'
ON CONFLICT (store_id) DO NOTHING;

-- ============================================================
-- crowd_history（各店舗2〜3件の過去履歴）
-- ============================================================
INSERT INTO crowd_history (store_id, level, recorded_at, recorded_by)
SELECT '10000000-0000-4000-8000-000000000004', lvl, NOW() - make_interval(hours => offset_h), u.id
FROM users u, (VALUES ('medium', 5), ('high', 2), ('high', 1)) AS t(lvl, offset_h)
WHERE u.email = 'satoh@ai-hackason.example';

INSERT INTO crowd_history (store_id, level, recorded_at, recorded_by)
SELECT '10000000-0000-4000-8000-000000000005', lvl, NOW() - make_interval(hours => offset_h), u.id
FROM users u, (VALUES ('low', 4), ('low', 1)) AS t(lvl, offset_h)
WHERE u.email = 'itagaki@ai-hackason.example';

INSERT INTO crowd_history (store_id, level, recorded_at, recorded_by)
SELECT '10000000-0000-4000-8000-000000000006', lvl, NOW() - make_interval(hours => offset_h), u.id
FROM users u, (VALUES ('low', 6), ('medium', 2)) AS t(lvl, offset_h)
WHERE u.email = 'itagaki@ai-hackason.example';

INSERT INTO crowd_history (store_id, level, recorded_at, recorded_by)
SELECT '10000000-0000-4000-8000-000000000007', lvl, NOW() - make_interval(hours => offset_h), u.id
FROM users u, (VALUES ('low', 3)) AS t(lvl, offset_h)
WHERE u.email = 'takayanagi@ai-hackason.example';

INSERT INTO crowd_history (store_id, level, recorded_at, recorded_by)
SELECT '10000000-0000-4000-8000-000000000008', lvl, NOW() - make_interval(hours => offset_h), u.id
FROM users u, (VALUES ('medium', 4), ('high', 1)) AS t(lvl, offset_h)
WHERE u.email = 'takayanagi@ai-hackason.example';

INSERT INTO crowd_history (store_id, level, recorded_at, recorded_by)
SELECT '10000000-0000-4000-8000-000000000009', lvl, NOW() - make_interval(hours => offset_h), u.id
FROM users u, (VALUES ('medium', 5), ('medium', 2)) AS t(lvl, offset_h)
WHERE u.email = 'yoshizawa@ai-hackason.example';

-- ============================================================
-- crowd_analytics（各店舗・本日分の集計）
-- ============================================================
INSERT INTO crowd_analytics (store_id, date_period, level_distribution, peak_hour, peak_level, total_updates)
VALUES
  ('10000000-0000-4000-8000-000000000004', CURRENT_DATE, '{"low": 1, "medium": 3, "high": 4}', 19, 'high', 8),
  ('10000000-0000-4000-8000-000000000005', CURRENT_DATE, '{"low": 6, "medium": 1, "high": 0}', 8, 'low', 7),
  ('10000000-0000-4000-8000-000000000006', CURRENT_DATE, '{"low": 4, "medium": 3, "high": 0}', 13, 'medium', 7),
  ('10000000-0000-4000-8000-000000000007', CURRENT_DATE, '{"low": 5, "medium": 1, "high": 0}', 11, 'low', 6),
  ('10000000-0000-4000-8000-000000000008', CURRENT_DATE, '{"low": 0, "medium": 3, "high": 5}', 21, 'high', 8),
  ('10000000-0000-4000-8000-000000000009', CURRENT_DATE, '{"low": 2, "medium": 5, "high": 1}', 15, 'medium', 8)
ON CONFLICT (store_id, date_period) DO NOTHING;

-- ============================================================
-- crowd_patterns（各店舗2件の時間帯別想定混雑度）
-- ============================================================
INSERT INTO crowd_patterns (store_id, hour_of_day, level) VALUES
  ('10000000-0000-4000-8000-000000000004', 12, 'high'),
  ('10000000-0000-4000-8000-000000000004', 19, 'high'),
  ('10000000-0000-4000-8000-000000000005', 8, 'medium'),
  ('10000000-0000-4000-8000-000000000005', 16, 'low'),
  ('10000000-0000-4000-8000-000000000006', 11, 'medium'),
  ('10000000-0000-4000-8000-000000000006', 17, 'low'),
  ('10000000-0000-4000-8000-000000000007', 14, 'low'),
  ('10000000-0000-4000-8000-000000000007', 18, 'medium'),
  ('10000000-0000-4000-8000-000000000008', 19, 'medium'),
  ('10000000-0000-4000-8000-000000000008', 21, 'high'),
  ('10000000-0000-4000-8000-000000000009', 13, 'medium'),
  ('10000000-0000-4000-8000-000000000009', 15, 'medium')
ON CONFLICT (store_id, hour_of_day) DO NOTHING;

-- ============================================================
-- likes（複数ユーザーが各店舗にいいね）
-- ============================================================
INSERT INTO likes (user_id, store_id)
SELECT u.id, s.store_id
FROM users u
CROSS JOIN (VALUES
  ('10000000-0000-4000-8000-000000000004'::uuid),
  ('10000000-0000-4000-8000-000000000005'::uuid),
  ('10000000-0000-4000-8000-000000000006'::uuid),
  ('10000000-0000-4000-8000-000000000007'::uuid),
  ('10000000-0000-4000-8000-000000000008'::uuid),
  ('10000000-0000-4000-8000-000000000009'::uuid)
) AS s(store_id)
WHERE u.email IN ('satoh@ai-hackason.example', 'test@gmail.com')
ON CONFLICT (user_id, store_id) DO NOTHING;

INSERT INTO likes (user_id, store_id)
SELECT u.id, '10000000-0000-4000-8000-000000000004' FROM users u WHERE u.email = 'itagaki@ai-hackason.example'
ON CONFLICT (user_id, store_id) DO NOTHING;

INSERT INTO likes (user_id, store_id)
SELECT u.id, '10000000-0000-4000-8000-000000000008' FROM users u WHERE u.email = 'yoshizawa@ai-hackason.example'
ON CONFLICT (user_id, store_id) DO NOTHING;

-- ============================================================
-- reviews（トリガーで review_stats が自動更新される）
-- ============================================================
INSERT INTO reviews (user_id, store_id, rating, comment)
SELECT u.id, '10000000-0000-4000-8000-000000000004', 5, 'テストレビュー：スープが濃厚で美味しい！'
FROM users u WHERE u.email = 'test@gmail.com';

INSERT INTO reviews (user_id, store_id, rating, comment)
SELECT u.id, '10000000-0000-4000-8000-000000000005', 4, 'テストレビュー：クロワッサンが焼きたてでした'
FROM users u WHERE u.email = 'satoh@ai-hackason.example';

INSERT INTO reviews (user_id, store_id, rating, comment)
SELECT u.id, '10000000-0000-4000-8000-000000000006', 5, 'テストレビュー：花束のセンスが良かったです'
FROM users u WHERE u.email = 'itagaki@ai-hackason.example';

INSERT INTO reviews (user_id, store_id, rating, comment)
SELECT u.id, '10000000-0000-4000-8000-000000000007', 3, 'テストレビュー：品揃えは普通でした'
FROM users u WHERE u.email = 'takayanagi@ai-hackason.example';

INSERT INTO reviews (user_id, store_id, rating, comment)
SELECT u.id, '10000000-0000-4000-8000-000000000008', 4, 'テストレビュー：お通しが美味しかった'
FROM users u WHERE u.email = 'test@gmail.com';

INSERT INTO reviews (user_id, store_id, rating, comment)
SELECT u.id, '10000000-0000-4000-8000-000000000009', 4, 'テストレビュー：可愛い雑貨が多かったです'
FROM users u WHERE u.email = 'yoshizawa@ai-hackason.example';

-- ============================================================
-- reservations（各店舗1〜2件）
-- ============================================================
INSERT INTO reservations (store_id, user_id, reservation_date, reservation_time, party_size, status)
SELECT '10000000-0000-4000-8000-000000000004', u.id, CURRENT_DATE + 1, '12:30', 2, 'confirmed'
FROM users u WHERE u.email = 'test@gmail.com';

INSERT INTO reservations (store_id, user_id, reservation_date, reservation_time, party_size, status)
SELECT '10000000-0000-4000-8000-000000000008', u.id, CURRENT_DATE + 3, '18:00', 5, 'confirmed'
FROM users u WHERE u.email = 'satoh@ai-hackason.example';

INSERT INTO reservations (store_id, user_id, reservation_date, reservation_time, party_size, status)
SELECT '10000000-0000-4000-8000-000000000008', u.id, CURRENT_DATE + 4, '19:30', 3, 'pending'
FROM users u WHERE u.email = 'itagaki@ai-hackason.example';

-- ============================================================
-- 動作確認用クエリ
-- ============================================================
-- SELECT s.name,
--   (SELECT count(*) FROM crowd_history ch WHERE ch.store_id = s.id) AS history_count,
--   (SELECT count(*) FROM likes l WHERE l.store_id = s.id) AS like_count,
--   (SELECT count(*) FROM reviews r WHERE r.store_id = s.id) AS review_count,
--   (SELECT count(*) FROM reservations rv WHERE rv.store_id = s.id) AS reservation_count
-- FROM stores s
-- WHERE s.id IN (
--   '10000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000005',
--   '10000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000007',
--   '10000000-0000-4000-8000-000000000008','10000000-0000-4000-8000-000000000009'
-- )
-- ORDER BY s.name;
