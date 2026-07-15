// T18: vercel.json の cron スケジュールが再びUTC/JST変換ミスで書き換えられることを
// 機械的に防止する。値の意味は docs/architecture-audit/refactoring-handbook.md T18 と
// CLAUDE.md の「Cron スケジュール（UTC/JST 変換に注意）」を参照。
import vercelConfig from '../../vercel.json'

describe('vercel.json cron schedules (T18)', () => {
  it('notify-congestion runs every 30min during UTC 0-12 (= JST 9:00-21:30)', () => {
    const cron = vercelConfig.crons.find((c) => c.path === '/api/cron/notify-congestion')
    expect(cron?.schedule).toBe('*/30 0-12 * * *')
  })

  it('aggregate-crowd-analytics runs daily at UTC 14:00 (= JST 23:00)', () => {
    const cron = vercelConfig.crons.find((c) => c.path === '/api/cron/aggregate-crowd-analytics')
    expect(cron?.schedule).toBe('0 14 * * *')
  })
})
