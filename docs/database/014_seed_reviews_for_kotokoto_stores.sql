-- 「ことこと町」8店舗へのレビュー・評価シード（世界観トーン）
-- 対象Issue: #151（スコアリング「評価25%」死んでいる問題への対応）
--
-- ⚠️ 共有DBのため、適用前に必ずチーム（Teams）で調整してから実行してください。
--    本ファイルは作成のみで、Supabaseへの適用（実行）はまだ行っていません。
--
-- ⚠️ 適用順序：本SQLは 013_seed_kotokoto_town_master.sql が投入する固定UUID
--    （20000000-0000-4000-8000-000000000001〜008）の stores 行に依存するため、
--    013 の後、または同時に適用してください（013未適用の状態で本SQLだけ実行すると
--    reviews.store_id の外部キー制約違反になります）。
--
-- 背景：
--   backend/domains/plan/scoring.ts の scoreStore() はレビュー無し店舗を rating=null
--   → 0.5点固定で扱う（重み25%）。シードレビューが無い8店舗は全店このフォールバックに
--   落ち、店舗間でスコア差が出ず「評価25%」の重みが実質死んでいた。また
--   backend/domains/plan/promptBuilder.ts のプロンプトにも「評価 未評価」がそのまま
--   出力され、デモの見栄えが悪かった。本SQLで8店舗すべてに評価を投入し、店舗ごとに
--   スコアに差が出るようにする。
--
-- レビュー投稿者について：投稿者はテストアカウント4名
--   （yoshizawa/satoh/itagaki/takayanagi@ai-hackason.example）を使い回す。
--   013_seed_kotokoto_town_master.sql と同様、SELECT id FROM users WHERE email = '...'
--   のサブクエリで参照する（ハードコードされたuser UUIDは使わない）。
--
-- review_stats（集計）について：refresh_review_stats() トリガー
--   （002_create_likes_reviews_tables.sql）が reviews への INSERT のたびに
--   review_stats を自動再計算するため、本SQLは reviews への INSERT のみを行う。
--   review_stats への手動 INSERT/UPSERT は不要（かつ行うと二重計算の原因になるため
--   行わない）。
--
-- べき等性について：reviews テーブルには自然な一意制約が無く（008/010 の既存シードでも
--   「reviews は一意制約を持たないため複数回実行すると重複する」と明記されている）、
--   スキーマ変更なしに ON CONFLICT は使えない。本SQLでは
--   INSERT ... SELECT ... WHERE NOT EXISTS (同一 store_id + user_id + comment の行) で
--   ガードし、再実行しても行が重複しないようにしている。
--
-- rating の値について：reviews.rating は SMALLINT CHECK (rating BETWEEN 1 AND 5) の
--   整数列のため、小数（4.5等）は入れられない。店舗ごとに整数レーティングを2〜3件
--   組み合わせ、平均（avg_rating）が店舗間で明確に差が出るようにしている
--   （下記「狙いの平均」はコメントとして記載、実際の平均は review_stats 側で算出される）。
--
-- 実行方法：Supabase ダッシュボード > SQL Editor に貼り付けて実行してください（未実行）。

-- ============================================================
-- 1. のんびり亭（定食屋・ランチ）狙いの平均: (5+4+5)/3 = 4.67
-- ============================================================
INSERT INTO reviews (user_id, store_id, rating, comment)
SELECT u.id, '20000000-0000-4000-8000-000000000001', 5, '日替わり定食のおみそ汁が優しい味でおかわりしたくなりました🍲'
FROM users u WHERE u.email = 'yoshizawa@ai-hackason.example'
AND NOT EXISTS (
  SELECT 1 FROM reviews r WHERE r.store_id = '20000000-0000-4000-8000-000000000001'
  AND r.user_id = u.id AND r.comment = '日替わり定食のおみそ汁が優しい味でおかわりしたくなりました🍲'
);

INSERT INTO reviews (user_id, store_id, rating, comment)
SELECT u.id, '20000000-0000-4000-8000-000000000001', 4, '町の人たちに交じって定食をいただくと、旅の疲れがほぐれる気がします'
FROM users u WHERE u.email = 'satoh@ai-hackason.example'
AND NOT EXISTS (
  SELECT 1 FROM reviews r WHERE r.store_id = '20000000-0000-4000-8000-000000000001'
  AND r.user_id = u.id AND r.comment = '町の人たちに交じって定食をいただくと、旅の疲れがほぐれる気がします'
);

INSERT INTO reviews (user_id, store_id, rating, comment)
SELECT u.id, '20000000-0000-4000-8000-000000000001', 5, '昼どきは賑わっていましたが、店主さんの手際が良くて待ち時間も苦になりません'
FROM users u WHERE u.email = 'itagaki@ai-hackason.example'
AND NOT EXISTS (
  SELECT 1 FROM reviews r WHERE r.store_id = '20000000-0000-4000-8000-000000000001'
  AND r.user_id = u.id AND r.comment = '昼どきは賑わっていましたが、店主さんの手際が良くて待ち時間も苦になりません'
);

-- ============================================================
-- 2. ことりの休憩処（カフェ）狙いの平均: (4+4+3)/3 = 3.67
-- ============================================================
INSERT INTO reviews (user_id, store_id, rating, comment)
SELECT u.id, '20000000-0000-4000-8000-000000000002', 4, '窓辺の席から小鳥のさえずりが聞こえて、コーヒーがいつもより美味しく感じました☕'
FROM users u WHERE u.email = 'takayanagi@ai-hackason.example'
AND NOT EXISTS (
  SELECT 1 FROM reviews r WHERE r.store_id = '20000000-0000-4000-8000-000000000002'
  AND r.user_id = u.id AND r.comment = '窓辺の席から小鳥のさえずりが聞こえて、コーヒーがいつもより美味しく感じました☕'
);

INSERT INTO reviews (user_id, store_id, rating, comment)
SELECT u.id, '20000000-0000-4000-8000-000000000002', 4, '午後の休憩にちょうど良い落ち着いた雰囲気でした'
FROM users u WHERE u.email = 'yoshizawa@ai-hackason.example'
AND NOT EXISTS (
  SELECT 1 FROM reviews r WHERE r.store_id = '20000000-0000-4000-8000-000000000002'
  AND r.user_id = u.id AND r.comment = '午後の休憩にちょうど良い落ち着いた雰囲気でした'
);

INSERT INTO reviews (user_id, store_id, rating, comment)
SELECT u.id, '20000000-0000-4000-8000-000000000002', 3, '混み合う時間帯は少し席を探すのに苦労しました'
FROM users u WHERE u.email = 'satoh@ai-hackason.example'
AND NOT EXISTS (
  SELECT 1 FROM reviews r WHERE r.store_id = '20000000-0000-4000-8000-000000000002'
  AND r.user_id = u.id AND r.comment = '混み合う時間帯は少し席を探すのに苦労しました'
);

-- ============================================================
-- 3. つきみ座（映画館）狙いの平均: (5+5)/2 = 5.0
-- ============================================================
INSERT INTO reviews (user_id, store_id, rating, comment)
SELECT u.id, '20000000-0000-4000-8000-000000000003', 5, '夜の上映後に見上げた看板の灯りが、そのまま映画の続きみたいで素敵でした🎬'
FROM users u WHERE u.email = 'itagaki@ai-hackason.example'
AND NOT EXISTS (
  SELECT 1 FROM reviews r WHERE r.store_id = '20000000-0000-4000-8000-000000000003'
  AND r.user_id = u.id AND r.comment = '夜の上映後に見上げた看板の灯りが、そのまま映画の続きみたいで素敵でした🎬'
);

INSERT INTO reviews (user_id, store_id, rating, comment)
SELECT u.id, '20000000-0000-4000-8000-000000000003', 5, 'ペアシートがゆったりしていて、長い上映時間もあっという間でした'
FROM users u WHERE u.email = 'takayanagi@ai-hackason.example'
AND NOT EXISTS (
  SELECT 1 FROM reviews r WHERE r.store_id = '20000000-0000-4000-8000-000000000003'
  AND r.user_id = u.id AND r.comment = 'ペアシートがゆったりしていて、長い上映時間もあっという間でした'
);

-- ============================================================
-- 4. まんまるパンや（パン屋・軽食）狙いの平均: (4+4+4)/3 = 4.0
-- ============================================================
INSERT INTO reviews (user_id, store_id, rating, comment)
SELECT u.id, '20000000-0000-4000-8000-000000000004', 4, '朝いちばんの焼きたてパンの香りが、通りまで漂っていました🥐'
FROM users u WHERE u.email = 'yoshizawa@ai-hackason.example'
AND NOT EXISTS (
  SELECT 1 FROM reviews r WHERE r.store_id = '20000000-0000-4000-8000-000000000004'
  AND r.user_id = u.id AND r.comment = '朝いちばんの焼きたてパンの香りが、通りまで漂っていました🥐'
);

INSERT INTO reviews (user_id, store_id, rating, comment)
SELECT u.id, '20000000-0000-4000-8000-000000000004', 4, '丸いフォルムのパンが並ぶ様子が可愛らしく、つい写真を撮ってしまいました'
FROM users u WHERE u.email = 'satoh@ai-hackason.example'
AND NOT EXISTS (
  SELECT 1 FROM reviews r WHERE r.store_id = '20000000-0000-4000-8000-000000000004'
  AND r.user_id = u.id AND r.comment = '丸いフォルムのパンが並ぶ様子が可愛らしく、つい写真を撮ってしまいました'
);

INSERT INTO reviews (user_id, store_id, rating, comment)
SELECT u.id, '20000000-0000-4000-8000-000000000004', 4, 'お昼どきは人気のパンが売り切れていたので、朝に行くのがおすすめです'
FROM users u WHERE u.email = 'itagaki@ai-hackason.example'
AND NOT EXISTS (
  SELECT 1 FROM reviews r WHERE r.store_id = '20000000-0000-4000-8000-000000000004'
  AND r.user_id = u.id AND r.comment = 'お昼どきは人気のパンが売り切れていたので、朝に行くのがおすすめです'
);

-- ============================================================
-- 5. ふわふわ雑貨店（雑貨店）狙いの平均: (3+4)/2 = 3.5
-- ============================================================
INSERT INTO reviews (user_id, store_id, rating, comment)
SELECT u.id, '20000000-0000-4000-8000-000000000005', 3, '雑貨の種類は豊富でしたが、目当ての品を見つけるのに少し時間がかかりました'
FROM users u WHERE u.email = 'takayanagi@ai-hackason.example'
AND NOT EXISTS (
  SELECT 1 FROM reviews r WHERE r.store_id = '20000000-0000-4000-8000-000000000005'
  AND r.user_id = u.id AND r.comment = '雑貨の種類は豊富でしたが、目当ての品を見つけるのに少し時間がかかりました'
);

INSERT INTO reviews (user_id, store_id, rating, comment)
SELECT u.id, '20000000-0000-4000-8000-000000000005', 4, 'ふわふわした手触りの小物が多くて、お土産選びが楽しかったです🧸'
FROM users u WHERE u.email = 'yoshizawa@ai-hackason.example'
AND NOT EXISTS (
  SELECT 1 FROM reviews r WHERE r.store_id = '20000000-0000-4000-8000-000000000005'
  AND r.user_id = u.id AND r.comment = 'ふわふわした手触りの小物が多くて、お土産選びが楽しかったです🧸'
);

-- ============================================================
-- 6. ひなた文庫（本屋・子連れ）狙いの平均: (5+4+5)/3 = 4.67
-- ============================================================
INSERT INTO reviews (user_id, store_id, rating, comment)
SELECT u.id, '20000000-0000-4000-8000-000000000006', 5, '日当たりの良い読み聞かせコーナーで、子どもが夢中になって絵本を選んでいました📚'
FROM users u WHERE u.email = 'satoh@ai-hackason.example'
AND NOT EXISTS (
  SELECT 1 FROM reviews r WHERE r.store_id = '20000000-0000-4000-8000-000000000006'
  AND r.user_id = u.id AND r.comment = '日当たりの良い読み聞かせコーナーで、子どもが夢中になって絵本を選んでいました📚'
);

INSERT INTO reviews (user_id, store_id, rating, comment)
SELECT u.id, '20000000-0000-4000-8000-000000000006', 4, '栞のプレゼントが嬉しくて、また絵本を買いに来たくなりました'
FROM users u WHERE u.email = 'itagaki@ai-hackason.example'
AND NOT EXISTS (
  SELECT 1 FROM reviews r WHERE r.store_id = '20000000-0000-4000-8000-000000000006'
  AND r.user_id = u.id AND r.comment = '栞のプレゼントが嬉しくて、また絵本を買いに来たくなりました'
);

INSERT INTO reviews (user_id, store_id, rating, comment)
SELECT u.id, '20000000-0000-4000-8000-000000000006', 5, '週末の読み聞かせの時間は席がいっぱいになるほど賑わっていました'
FROM users u WHERE u.email = 'takayanagi@ai-hackason.example'
AND NOT EXISTS (
  SELECT 1 FROM reviews r WHERE r.store_id = '20000000-0000-4000-8000-000000000006'
  AND r.user_id = u.id AND r.comment = '週末の読み聞かせの時間は席がいっぱいになるほど賑わっていました'
);

-- ============================================================
-- 7. きらきらアイス堂（スイーツ）狙いの平均: (5+4)/2 = 4.5
-- ============================================================
INSERT INTO reviews (user_id, store_id, rating, comment)
SELECT u.id, '20000000-0000-4000-8000-000000000007', 5, '2個目半額の時間帯を狙って、違う味を食べ比べできました🍨'
FROM users u WHERE u.email = 'yoshizawa@ai-hackason.example'
AND NOT EXISTS (
  SELECT 1 FROM reviews r WHERE r.store_id = '20000000-0000-4000-8000-000000000007'
  AND r.user_id = u.id AND r.comment = '2個目半額の時間帯を狙って、違う味を食べ比べできました🍨'
);

INSERT INTO reviews (user_id, store_id, rating, comment)
SELECT u.id, '20000000-0000-4000-8000-000000000007', 4, '開店直後に行ったら空いていて、ゆっくり選べました'
FROM users u WHERE u.email = 'satoh@ai-hackason.example'
AND NOT EXISTS (
  SELECT 1 FROM reviews r WHERE r.store_id = '20000000-0000-4000-8000-000000000007'
  AND r.user_id = u.id AND r.comment = '開店直後に行ったら空いていて、ゆっくり選べました'
);

-- ============================================================
-- 8. おひるねファミリー食堂（ファミレス・子連れ）狙いの平均: (4+3+4)/3 = 3.67
-- ============================================================
INSERT INTO reviews (user_id, store_id, rating, comment)
SELECT u.id, '20000000-0000-4000-8000-000000000008', 4, 'キッズメニュー無料の日に家族で行ったら、子どもが大喜びでした🍽️'
FROM users u WHERE u.email = 'itagaki@ai-hackason.example'
AND NOT EXISTS (
  SELECT 1 FROM reviews r WHERE r.store_id = '20000000-0000-4000-8000-000000000008'
  AND r.user_id = u.id AND r.comment = 'キッズメニュー無料の日に家族で行ったら、子どもが大喜びでした🍽️'
);

INSERT INTO reviews (user_id, store_id, rating, comment)
SELECT u.id, '20000000-0000-4000-8000-000000000008', 3, '土日の混雑時間帯は待ち時間が長めでした'
FROM users u WHERE u.email = 'takayanagi@ai-hackason.example'
AND NOT EXISTS (
  SELECT 1 FROM reviews r WHERE r.store_id = '20000000-0000-4000-8000-000000000008'
  AND r.user_id = u.id AND r.comment = '土日の混雑時間帯は待ち時間が長めでした'
);

INSERT INTO reviews (user_id, store_id, rating, comment)
SELECT u.id, '20000000-0000-4000-8000-000000000008', 4, '平日の空いた時間にお昼寝中の子を連れて行っても気兼ねなく過ごせました'
FROM users u WHERE u.email = 'yoshizawa@ai-hackason.example'
AND NOT EXISTS (
  SELECT 1 FROM reviews r WHERE r.store_id = '20000000-0000-4000-8000-000000000008'
  AND r.user_id = u.id AND r.comment = '平日の空いた時間にお昼寝中の子を連れて行っても気兼ねなく過ごせました'
);

-- ============================================================
-- 動作確認用クエリ
-- ============================================================
-- SELECT s.name, rs.avg_rating, rs.review_count
-- FROM review_stats rs JOIN stores s ON s.id = rs.store_id
-- WHERE s.id LIKE '20000000-0000-4000-8000-%'
-- ORDER BY s.name;
