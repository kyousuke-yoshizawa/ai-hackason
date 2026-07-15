-- stores テーブルへの追加テストデータ（多様な店名・カテゴリ + 店舗写真）
-- 作成日：2026年7月15日
-- 目的：008 で投入した「ことこと」系3店舗に加えて、様々な業態のテスト店舗を追加し、
--       store_media（Issue #35/#36）経由でイメージ写真を紐付ける。
--
-- ⚠️ 写真について：src/lib/api-stubs.ts の mediaApi は Supabase Storage バケット
--    'store-media' への実アップロードを前提としているが、現時点でフロント側に
--    store_media を表示するUIは未実装（バックエンドのスキーマのみ存在）。
--    そのため file_path には Supabase Storage の相対パスではなく、Unsplash の
--    実在する画像を指す直リンク（画像として実際に開けることを確認済み）を
--    そのまま格納している。将来 <img src> で直接表示する分には問題なく使えるが、
--    Storage 経由の削除・アップロード処理（mediaApi.deleteMedia 等）の対象には
--    ならない点に注意。
--
-- 実行方法：Supabase ダッシュボード > SQL Editor に貼り付けて実行してください。
-- べき等性：id / (store_id, media_type がユニークではない) 固定UUIDで ON CONFLICT
--          DO NOTHING しているため stores は再実行安全。store_media 側は一意制約が
--          ないため複数回実行すると写真行が重複するので注意。

-- ============================================================
-- 追加テスト店舗（6件・多様な業態）
-- ============================================================

INSERT INTO stores (id, name, category, x, y, open_time, close_time, price_min, price_max, created_by)
SELECT '10000000-0000-4000-8000-000000000004', '麺屋 一福', 'ramen', 80.00, 200.00, '11:00', '22:00', 700, 1200, u.id
FROM users u WHERE u.email = 'yoshizawa@ai-hackason.example'
ON CONFLICT (id) DO NOTHING;

INSERT INTO stores (id, name, category, x, y, open_time, close_time, price_min, price_max, created_by)
SELECT '10000000-0000-4000-8000-000000000005', 'ふわふわパン工房', 'bakery', 150.00, 40.00, '07:00', '18:00', 200, 800, u.id
FROM users u WHERE u.email = 'yoshizawa@ai-hackason.example'
ON CONFLICT (id) DO NOTHING;

INSERT INTO stores (id, name, category, x, y, open_time, close_time, price_min, price_max, created_by)
SELECT '10000000-0000-4000-8000-000000000006', 'はなよし花店', 'flower', 250.00, 100.00, '09:00', '19:00', 500, 8000, u.id
FROM users u WHERE u.email = 'yoshizawa@ai-hackason.example'
ON CONFLICT (id) DO NOTHING;

INSERT INTO stores (id, name, category, x, y, open_time, close_time, price_min, price_max, created_by)
SELECT '10000000-0000-4000-8000-000000000007', '本の森書店', 'bookstore', 30.00, 120.00, '10:00', '20:00', 500, 3000, u.id
FROM users u WHERE u.email = 'yoshizawa@ai-hackason.example'
ON CONFLICT (id) DO NOTHING;

INSERT INTO stores (id, name, category, x, y, open_time, close_time, price_min, price_max, created_by)
SELECT '10000000-0000-4000-8000-000000000008', '酒場つばめ', 'izakaya', 180.00, 220.00, '17:00', '23:30', 1000, 4000, u.id
FROM users u WHERE u.email = 'yoshizawa@ai-hackason.example'
ON CONFLICT (id) DO NOTHING;

INSERT INTO stores (id, name, category, x, y, open_time, close_time, price_min, price_max, created_by)
SELECT '10000000-0000-4000-8000-000000000009', 'ひなた雑貨店', 'goods', 220.00, 60.00, '10:00', '18:00', 300, 2000, u.id
FROM users u WHERE u.email = 'yoshizawa@ai-hackason.example'
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 店舗写真（store_media・Issue #35/#36）
-- カテゴリに合わせた実在の写真（Unsplashの直リンク、画像として開けることを確認済み）
-- ============================================================

INSERT INTO store_media (store_id, media_type, file_path, file_name, mime_type, created_by)
SELECT '10000000-0000-4000-8000-000000000004', 'image',
  'https://images.unsplash.com/photo-1741866703526-554880a40c15?w=1200&q=80&auto=format&fit=crop',
  'menya-ippuku-1.jpg', 'image/jpeg', u.id
FROM users u WHERE u.email = 'yoshizawa@ai-hackason.example';

INSERT INTO store_media (store_id, media_type, file_path, file_name, mime_type, created_by)
SELECT '10000000-0000-4000-8000-000000000005', 'image',
  'https://images.unsplash.com/photo-1587241321921-91a834d6d191?w=1200&q=80&auto=format&fit=crop',
  'fuwafuwa-bakery-1.jpg', 'image/jpeg', u.id
FROM users u WHERE u.email = 'yoshizawa@ai-hackason.example';

INSERT INTO store_media (store_id, media_type, file_path, file_name, mime_type, created_by)
SELECT '10000000-0000-4000-8000-000000000006', 'image',
  'https://images.unsplash.com/photo-1589244159943-460088ed5c92?w=1200&q=80&auto=format&fit=crop',
  'hanayoshi-flower-1.jpg', 'image/jpeg', u.id
FROM users u WHERE u.email = 'yoshizawa@ai-hackason.example';

INSERT INTO store_media (store_id, media_type, file_path, file_name, mime_type, created_by)
SELECT '10000000-0000-4000-8000-000000000007', 'image',
  'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=1200&q=80&auto=format&fit=crop',
  'hon-no-mori-bookstore-1.jpg', 'image/jpeg', u.id
FROM users u WHERE u.email = 'yoshizawa@ai-hackason.example';

INSERT INTO store_media (store_id, media_type, file_path, file_name, mime_type, created_by)
SELECT '10000000-0000-4000-8000-000000000008', 'image',
  'https://images.unsplash.com/photo-1608060146923-7b8ab13e22bb?w=1200&q=80&auto=format&fit=crop',
  'sakaba-tsubame-1.jpg', 'image/jpeg', u.id
FROM users u WHERE u.email = 'yoshizawa@ai-hackason.example';

INSERT INTO store_media (store_id, media_type, file_path, file_name, mime_type, created_by)
SELECT '10000000-0000-4000-8000-000000000009', 'image',
  'https://images.unsplash.com/photo-1603912699214-92627f304eb6?w=1200&q=80&auto=format&fit=crop',
  'hinata-zakka-1.jpg', 'image/jpeg', u.id
FROM users u WHERE u.email = 'yoshizawa@ai-hackason.example';

-- ============================================================
-- 動作確認用クエリ
-- ============================================================
-- SELECT s.name, s.category, sm.file_path
-- FROM stores s LEFT JOIN store_media sm ON sm.store_id = s.id
-- ORDER BY s.created_at;
