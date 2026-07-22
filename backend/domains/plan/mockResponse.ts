import type { GeneratePlanResponse } from './schema.js'

// Issue #121（モックモード）: ANTHROPIC_API_KEYが無い環境でもプラン生成のE2Eフローを
// 確認できるよう、固定のプラン応答を返す。ここで使う店舗ID・名称・営業時間・評価は
// docs/database/013_seed_kotokoto_town_master.sql（ことこと町マスタ）で実際にシードされている
// 値を使用する（ratingはdocs/database/014_seed_reviews_for_kotokoto_stores.sqlに正確な平均値が
// 見当たらないため、要件定義書の雰囲気に沿ったもっともらしい値を仮置きしている）
export const MOCK_PLAN_RESPONSE: GeneratePlanResponse = {
  intent: {
    desires: ['ランチ', 'カフェ'],
    party_size: 2,
    budget: null,
    time_limit: '15:00',
  },
  candidates: [
    {
      label: '案A',
      score: 0.8,
      summary: '定食屋でしっかりランチを食べたあと、隣接するカフェでのんびり休憩するプランです。',
      stops: [
        {
          store_id: '20000000-0000-4000-8000-000000000001',
          store_name: 'のんびり亭',
          start_time: '12:00',
          end_time: '13:00',
          travel_note: '町の入口からすぐ',
          reason: '人気の定食屋で、ランチ時間帯にしっかり食事ができます',
          rating: 4.67,
          open_time: '11:00',
          close_time: '21:00',
          crowd_note: 'お昼時はやや混み合います',
          offer_note: null,
        },
        {
          store_id: '20000000-0000-4000-8000-000000000002',
          store_name: 'ことりの休憩処',
          start_time: '13:30',
          end_time: '14:30',
          travel_note: '徒歩5分程度',
          reason: '食後にゆったりお茶ができるカフェです',
          rating: 4.5,
          open_time: '10:00',
          close_time: '19:00',
          crowd_note: '午後は落ち着いています',
          offer_note: null,
        },
      ],
    },
    {
      label: '案B',
      score: 0.75,
      summary: 'パン屋で軽く食事をしたあと、アイス屋でデザートを楽しむ軽めのプランです。',
      stops: [
        {
          store_id: '20000000-0000-4000-8000-000000000004',
          store_name: 'まんまるパンや',
          start_time: '12:00',
          end_time: '12:45',
          travel_note: '町の中心からすぐ',
          reason: '軽めのランチにぴったりなパン屋です',
          rating: 4.0,
          open_time: '08:00',
          close_time: '19:00',
          crowd_note: 'お昼どきはやや混み合います',
          offer_note: null,
        },
        {
          store_id: '20000000-0000-4000-8000-000000000007',
          store_name: 'きらきらアイス堂',
          start_time: '13:00',
          end_time: '13:30',
          travel_note: '徒歩3分程度',
          reason: '食後にさっぱりしたアイスでデザートを楽しめます',
          rating: 4.5,
          open_time: '11:00',
          close_time: '20:00',
          crowd_note: '午後は落ち着いています',
          offer_note: null,
        },
      ],
    },
  ],
}
