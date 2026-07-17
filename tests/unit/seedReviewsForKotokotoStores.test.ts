// Issue #151: シードSQL（docs/database/014_seed_reviews_for_kotokoto_stores.sql）の
// 静的内容チェック。実DBには接続せず、ファイルテキストをそのまま検証する
// （vercelCronSchedule.test.ts と同様、生成物の機械的な劣化防止が目的）。
import fs from 'fs'
import path from 'path'

const SEED_FILE_PATH = path.join(
  __dirname,
  '../../docs/database/014_seed_reviews_for_kotokoto_stores.sql'
)
const sql = fs.readFileSync(SEED_FILE_PATH, 'utf-8')

const STORE_IDS = Array.from(
  { length: 8 },
  (_, i) => `20000000-0000-4000-8000-00000000000${i + 1}`
)

describe('014_seed_reviews_for_kotokoto_stores.sql', () => {
  it('ことこと町8店舗のUUIDがすべて出現する', () => {
    for (const storeId of STORE_IDS) {
      expect(sql).toContain(storeId)
    }
  })

  it('各店舗に2件以上のreviews INSERT行がある', () => {
    for (const storeId of STORE_IDS) {
      const matches = sql.match(
        new RegExp(`INSERT INTO reviews[\\s\\S]{0,200}?'${storeId}'`, 'g')
      )
      expect(matches?.length ?? 0).toBeGreaterThanOrEqual(2)
    }
  })

  it('rating値が店舗間で一律ではない（スコア差が出る）', () => {
    const ratings = [...sql.matchAll(/INSERT INTO reviews \(user_id, store_id, rating, comment\)\nSELECT u\.id, '[^']+', (\d+),/g)].map(
      (m) => Number(m[1])
    )
    expect(ratings.length).toBeGreaterThanOrEqual(16)
    expect(new Set(ratings).size).toBeGreaterThan(1)
  })

  it('review_statsへの手動INSERT/UPSERTは行わない（トリガー任せ）', () => {
    expect(sql).not.toMatch(/INSERT INTO review_stats/)
  })

  it('reviewsに対する冪等性ガード（NOT EXISTS）がある', () => {
    expect(sql).toMatch(/WHERE NOT EXISTS/)
  })
})
