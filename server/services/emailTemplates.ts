import type { CongestionReportData } from '../types/email.js'

const LEVEL_LABEL: Record<CongestionReportData['congestionLevel'], string> = {
  low: '空いています',
  medium: '混雑しています',
  high: '非常に混雑しています',
}

const LEVEL_COLOR: Record<CongestionReportData['congestionLevel'], string> = {
  low: '#16a34a',
  medium: '#d97706',
  high: '#dc2626',
}

export function renderCongestionReportSubject(data: CongestionReportData): string {
  return `【混雑通知】${data.storeName} は現在${LEVEL_LABEL[data.congestionLevel]}`
}

export function renderCongestionReportHtml(data: CongestionReportData): string {
  const occupancyRate = data.capacity > 0
    ? Math.round((data.currentVisitorCount / data.capacity) * 100)
    : 0

  return `
<!DOCTYPE html>
<html lang="ja">
  <body style="margin:0;padding:24px;background-color:#f4f4f5;font-family:'Hiragino Sans',sans-serif;">
    <table role="presentation" width="100%" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;">
      <tr>
        <td style="padding:24px;">
          <h1 style="font-size:18px;margin:0 0 16px;color:#18181b;">${data.storeName} の混雑状況</h1>
          <p style="font-size:14px;margin:0 0 8px;color:${LEVEL_COLOR[data.congestionLevel]};font-weight:bold;">
            ${LEVEL_LABEL[data.congestionLevel]}
          </p>
          <p style="font-size:14px;margin:0 0 4px;color:#3f3f46;">
            現在の来店者数: ${data.currentVisitorCount} / ${data.capacity} 人（占有率 ${occupancyRate}%）
          </p>
          <p style="font-size:12px;margin:16px 0 0;color:#71717a;">
            レポート時刻: ${data.reportedAt}
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>
`.trim()
}
