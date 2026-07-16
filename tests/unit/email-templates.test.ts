import { renderCongestionReportHtml, renderCongestionReportSubject } from '../../backend/domains/email/templates'

describe('congestion report email template', () => {
  const base = {
    storeName: '渋谷店',
    level: 'high' as const,
    updatedAt: '2026-07-13T10:00:00.000Z',
  }

  it('renders a subject that includes the store name and level label', () => {
    expect(renderCongestionReportSubject(base)).toBe('【混雑通知】渋谷店 は現在混雑')
  })

  it('renders html including the store name and level', () => {
    const html = renderCongestionReportHtml(base)
    expect(html).toContain('渋谷店')
    expect(html).toContain('混雑')
    expect(html).not.toContain('混雑状態を報告してください')
  })

  it('renders the 3 report buttons when reportLinks are provided', () => {
    const html = renderCongestionReportHtml({
      ...base,
      reportLinks: [
        { level: 'high', url: 'https://example.com/api/crowd/report?level=high&token=abc' },
        { level: 'medium', url: 'https://example.com/api/crowd/report?level=medium&token=abc' },
        { level: 'low', url: 'https://example.com/api/crowd/report?level=low&token=abc' },
      ],
    })
    expect(html).toContain('混雑状態を報告してください')
    expect(html).toContain('混雑')
    expect(html).toContain('普通')
    expect(html).toContain('空いている')
    expect(html).toContain('level=high&token=abc')
    expect(html).toContain('level=medium&token=abc')
    expect(html).toContain('level=low&token=abc')
  })
})
