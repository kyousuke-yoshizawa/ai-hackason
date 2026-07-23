// T18: cron スケジュールが再びUTC/JST変換ミスで書き換えられることを機械的に防止する。
// 値の意味は docs/architecture-audit/refactoring-handbook.md T18 と
// CLAUDE.md の「Cron スケジュール（UTC/JST 変換に注意）」を参照。
//
// 2026-07-16、Vercel Pro試用の失効に伴いHobbyプランへ移行。Hobbyのcronは1日1回までの
// 制限があり、30分おきのnotify-congestionはVercel Cronに置けなくなったため
// GitHub Actions（.github/workflows/notify-congestion-cron.yml）に移行した。
// aggregate-crowd-analytics（1日1回）は引き続きVercel Cronのまま。
import fs from 'node:fs'
import path from 'node:path'
import vercelConfig from '../../vercel.json'

describe('vercel.json cron schedules (T18)', () => {
  it('does not define notify-congestion (moved to GitHub Actions due to Hobby plan daily-cron limit)', () => {
    const cron = vercelConfig.crons.find((c) => c.path === '/api/cron/notify-congestion')
    expect(cron).toBeUndefined()
  })

  it('aggregate-crowd-analytics runs daily at UTC 14:00 (= JST 23:00)', () => {
    const cron = vercelConfig.crons.find((c) => c.path === '/api/cron/aggregate-crowd-analytics')
    expect(cron?.schedule).toBe('0 14 * * *')
  })
})

describe('notify-congestion-cron.yml schedule (T18)', () => {
  it('runs every 30min during UTC 0-12 (= JST 9:00-21:30)', () => {
    const workflowPath = path.join(__dirname, '../../.github/workflows/notify-congestion-cron.yml')
    const workflowYaml = fs.readFileSync(workflowPath, 'utf8')
    const match = workflowYaml.match(/^\s*-\s*cron:\s*['"]([^'"]+)['"]/m)
    expect(match?.[1]).toBe('*/30 0-12 * * *')
  })
})
