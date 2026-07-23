import { z } from 'zod'

// backend/domains/crowd/types.ts の CongestionLevel と値を揃える
export const congestionLevelSchema = z.enum(['low', 'medium', 'high'])

// POST /api/crowd/report の req.body（店舗管理者/adminが直接報告する場合）
export const reportCrowdBodySchema = z.object({
  store_id: z.string().min(1),
  level: congestionLevelSchema,
})

// PUT /api/crowd/patterns/:store_id の req.body の1要素
// day_of_week: 0=日曜〜6=土曜（JSのDate.getDay()と同じ規約）。null=全曜日共通のフォールバック
export const crowdPatternEntrySchema = z.object({
  day_of_week: z.number().int().min(0).max(6).nullable(),
  hour_of_day: z.number().int().min(0).max(23),
  level: congestionLevelSchema,
})

// PUT /api/crowd/patterns/:store_id の req.body 全体（店舗の全パターンをこの内容で置き換える）
// - 最大192件（day_of_week: 日〜土の7曜日 + 全曜日共通のnullフォールバック = 8種類 × 24時間）に制限
//   （CrowdPatternGrid.tsxのUIはnull行を含む8行×24列のグリッドを編集対象にしているため、
//   7×24=168だとグリッドを全て埋めて保存する正当な操作が拒否されてしまう）
// - (day_of_week, hour_of_day) の重複を拒否する。ここで弾かないと、repository側の
//   delete（既存行の全削除）が実行された「後」にDBのUNIQUE制約違反で挿入が失敗し、
//   店舗のパターンデータが削除済み・未挿入の中途半端な状態になってしまう。
export const putCrowdPatternsBodySchema = z
  .array(crowdPatternEntrySchema)
  .max(192, { message: 'patterns must contain at most 192 entries (8 day-of-week variants x 24 hours)' })
  .refine(
    (entries) => {
      const keys = entries.map((entry) => `${entry.day_of_week}:${entry.hour_of_day}`)
      return new Set(keys).size === keys.length
    },
    { message: 'duplicate (day_of_week, hour_of_day) pair in patterns' },
  )
