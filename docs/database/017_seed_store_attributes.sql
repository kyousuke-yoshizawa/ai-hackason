-- 「ことこと町」8店舗への属性値シード（tags/closed_days/last_order_time/description/sub_area）
-- 対象Issue: #126（tags）, #127（closed_days）, #128（last_order_time）,
--            #129（description）, #130（sub_area）
-- 作成日：2026年7月22日
--
-- ⚠️ 共有DBのため、適用前に必ずチーム（Teams）で調整してから実行してください。
--    本ファイルは作成のみで、Supabaseへの適用（実行）はまだ行っていません。
--
-- ⚠️ 適用順序：
--   1. 016_add_store_attributes.sql（stores への5カラム追加）
--   2. 013_seed_kotokoto_town_master.sql（8店舗INSERT。固定UUID
--      20000000-0000-4000-8000-000000000001〜008）
--   の両方が適用済みであることが前提。本SQLはUPDATEのみで、013のINSERT文を
--   直接編集しない（013は既に別Issueの対象としてレビュー・マージ済みのため）。
--
-- べき等性：UPDATEのみのため複数回実行しても結果は変わらない（再実行安全）。
--
-- 各店舗の設定方針（013のコメント・要件定義書v2 2.2.1節の記述に準拠）：
--   - tags: 各店舗の性質から自然なものを2〜3個
--   - closed_days: 0=日曜〜6=土曜（JSのDate.getDay()と同じ規約）。多くの店は
--     週1定休、ファミレス・映画館・アイス堂は無休（曜日を問わず需要があるため）
--   - last_order_time: 013のコメントに記載のあった値（のんびり亭のL.O.20:30、
--     つきみ座の最終上映20:30相当）を踏襲。テイクアウト中心の店舗はL.O.概念が
--     薄いためNULL（未設定）のままとする
--   - description: 世界観トーンの紹介文（100〜200字目安）
--   - sub_area: 4区画に自然に振り分け

-- 1. のんびり亭（定食屋・ランチ）：週1定休（月曜）、L.O.20:30
UPDATE stores
SET
  tags = ARRAY['子連れOK', '屋内']::TEXT[],
  closed_days = ARRAY[1]::SMALLINT[], -- 月曜定休
  last_order_time = '20:30',
  description = 'ことこと町の目抜き通りにひっそり佇む定食屋。出汁の香りがふわりと漂う店内では、普段着のままふらりと立ち寄れる。名物の煮込み定食は、忙しい一日をそっと緩めてくれる、あたたかな一皿。',
  sub_area = '商店街エリア'
WHERE id = '20000000-0000-4000-8000-000000000001';

-- 2. ことりの休憩処（カフェ）：週1定休（火曜）、L.O.設定なし
UPDATE stores
SET
  tags = ARRAY['屋内', 'テラス席', 'おひとりさま歓迎']::TEXT[],
  closed_days = ARRAY[2]::SMALLINT[], -- 火曜定休
  last_order_time = NULL,
  description = '小鳥のさえずりが聞こえる小さな休憩処。窓際のテラス席に腰掛ければ、湯気の立つカップ片手にことこと町の午後がゆっくり流れていく。ひとりでも、誰かとでも、心地よく過ごせる場所。',
  sub_area = '広場エリア'
WHERE id = '20000000-0000-4000-8000-000000000002';

-- 3. つきみ座（映画館）：無休、最終上映20:30相当をL.O.として扱う
UPDATE stores
SET
  tags = ARRAY['屋内', 'デート向き']::TEXT[],
  closed_days = ARRAY[]::SMALLINT[], -- 無休
  last_order_time = '20:30', -- 最終上映時刻相当
  description = '町いちばんの老舗映画館。天鵞絨のカーテンが下りると、スクリーンには今日だけの物語が映し出される。並んで座るペアシートは、特別な時間を過ごしたい二人にそっと寄り添う。',
  sub_area = '駅前エリア'
WHERE id = '20000000-0000-4000-8000-000000000003';

-- 4. まんまるパンや（パン屋・軽食）：週1定休（水曜）、L.O.設定なし（持ち帰り中心）
UPDATE stores
SET
  tags = ARRAY['テイクアウト可', '子連れOK']::TEXT[],
  closed_days = ARRAY[3]::SMALLINT[], -- 水曜定休
  last_order_time = NULL,
  description = '朝いちばんに焼き上がる丸いパンの香りが、通り沿いにふわりと広がる。子ども連れでも気軽に立ち寄れる店内には、片手でほおばれる軽食が並び、忙しい朝の相棒になってくれる。',
  sub_area = '商店街エリア'
WHERE id = '20000000-0000-4000-8000-000000000004';

-- 5. ふわふわ雑貨店（雑貨店）：週1定休（水曜）、L.O.設定なし（物販のため）
UPDATE stores
SET
  tags = ARRAY['屋内', 'おひとりさま歓迎']::TEXT[],
  closed_days = ARRAY[3]::SMALLINT[], -- 水曜定休
  last_order_time = NULL,
  description = '棚いっぱいに並んだ手作りの小物たちが、訪れるたびに違う表情を見せてくれる雑貨店。ひとつひとつ手に取って選ぶ時間は、ことこと町での散策に小さな彩りを添えてくれる。',
  sub_area = '商店街エリア'
WHERE id = '20000000-0000-4000-8000-000000000005';

-- 6. ひなた文庫（本屋・子連れ）：週1定休（月曜）、L.O.設定なし
UPDATE stores
SET
  tags = ARRAY['子連れOK', '屋内']::TEXT[],
  closed_days = ARRAY[1]::SMALLINT[], -- 月曜定休
  last_order_time = NULL,
  description = '陽だまりの差し込む窓辺に、絵本から専門書までがぎっしりと並ぶ町の本屋さん。週末の読み聞かせの時間には、小さな来店客たちの笑い声がページをめくる音に重なる。',
  sub_area = '広場エリア'
WHERE id = '20000000-0000-4000-8000-000000000006';

-- 7. きらきらアイス堂（スイーツ）：週1定休（火曜）、L.O.19:30
UPDATE stores
SET
  tags = ARRAY['テイクアウト可', 'デート向き']::TEXT[],
  closed_days = ARRAY[2]::SMALLINT[], -- 火曜定休
  last_order_time = '19:30',
  description = 'カラフルなアイスケースがきらきらと輝く、町いちばんの人気店。食べ歩き用のコーンから贈り物用のカップまで揃い、待ち合わせ前のちょっとした寄り道にもぴったり。',
  sub_area = '公園エリア'
WHERE id = '20000000-0000-4000-8000-000000000007';

-- 8. おひるねファミリー食堂（ファミレス・子連れ）：無休、L.O.21:30
UPDATE stores
SET
  tags = ARRAY['子連れOK', 'テラス席', 'テイクアウト可']::TEXT[],
  closed_days = ARRAY[]::SMALLINT[], -- 無休
  last_order_time = '21:30',
  description = 'キッズスペース完備で、小さな子ども連れでも気兼ねなく過ごせるファミリー食堂。テラス席では広場を眺めながらの食事も楽しめ、朝から夜までことこと町の家族時間を支えてくれる。',
  sub_area = '駅前エリア'
WHERE id = '20000000-0000-4000-8000-000000000008';

-- ============================================================
-- 動作確認用クエリ
-- ============================================================
-- SELECT name, tags, closed_days, last_order_time, sub_area, description
-- FROM stores WHERE id LIKE '20000000-0000-4000-8000-%' ORDER BY name;
