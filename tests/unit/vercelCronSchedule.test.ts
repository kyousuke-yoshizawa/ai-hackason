// T18: vercel.json の cron スケジュールが再びUTC/JST変換ミスで書き換えられることを
// 機械的に防止する。値の意味は docs/architecture-audit/refactoring-handbook.md T18 と
// CLAUDE.md の「Cron スケジュール（UTC/JST 変換に注意）」を参照。
import vercelConfig from '../../vercel.json'

describe('vercel.json cron schedules (T18)', () => {
  // ⚠️ 暫定対応（2026-07-16、PR #169）: Vercel Hobbyプランはcronを1日1回までしか
  // 許可しないため、本来の30分おき（*/30 0-12 * * *）はデプロイが失敗する。
  // 恒久対応（プランアップグレード等）までの間、1日1回（UTC 0:00 = JST 9:00）に
  // 暫定変更している。詳細はCLAUDE.mdの「Cron スケジュール」節を参照。
  it('notify-congestion runs once per day at UTC 0:00 (= JST 9:00, Vercel Hobby plan制限による暫定対応)', () => {
    const cron = vercelConfig.crons.find((c) => c.path === '/api/cron/notify-congestion')
    expect(cron?.schedule).toBe('0 0 * * *')
  })

  it('aggregate-crowd-analytics runs daily at UTC 14:00 (= JST 23:00)', () => {
    const cron = vercelConfig.crons.find((c) => c.path === '/api/cron/aggregate-crowd-analytics')
    expect(cron?.schedule).toBe('0 14 * * *')
  })
})
