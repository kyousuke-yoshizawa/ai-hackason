import { renderCongestionReportHtml, renderCongestionReportSubject } from '../../api/_lib/email/templates'

describe('congestion report email template', () => {
  const base = {
    storeName: '渋谷店',
    level: 'high' as const,
    updatedAt: '2026-07-13T10:00:00.000Z',
  }

  it('renders a subject that includes the store name and level label', () => {
    expect(renderCongestionReportSubject(base)).toBe('【混雑通知】渋谷店 は現在非常に混雑しています')
  })

  it('renders html including the store name and level', () => {
    const html = renderCongestionReportHtml(base)
    expect(html).toContain('渋谷店')
    expect(html).toContain('非常に混雑しています')
    expect(html).not.toContain('混雑状況を更新する')
  })

  it('renders an action button when actionUrl is provided', () => {
    const html = renderCongestionReportHtml({ ...base, actionUrl: 'https://example.com/update?token=abc' })
    expect(html).toContain('https://example.com/update?token=abc')
    expect(html).toContain('混雑状況を更新する')
  })
})
