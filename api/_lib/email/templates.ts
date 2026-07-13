export type CongestionLevel = 'low' | 'medium' | 'high'

export interface CongestionReportData {
  storeName: string
  level: CongestionLevel
  updatedAt: string
  actionUrl?: string
}

const LEVEL_LABEL: Record<CongestionLevel, string> = {
  low: '空いています',
  medium: '混雑しています',
  high: '非常に混雑しています',
}

const LEVEL_COLOR: Record<CongestionLevel, string> = {
  low: '#16a34a',
  medium: '#d97706',
  high: '#dc2626',
}

export function renderCongestionReportSubject(data: CongestionReportData): string {
  return `【混雑通知】${data.storeName} は現在${LEVEL_LABEL[data.level]}`
}

export function renderCongestionReportHtml(data: CongestionReportData): string {
  const actionButton = data.actionUrl
    ? `<p style="margin:24px 0 0;">
         <a href="${data.actionUrl}" style="display:inline-block;padding:10px 20px;background:#18181b;color:#ffffff;border-radius:6px;text-decoration:none;font-size:14px;">
           混雑状況を更新する
         </a>
       </p>`
    : ''

  return `
<!DOCTYPE html>
<html lang="ja">
  <body style="margin:0;padding:24px;background-color:#f4f4f5;font-family:'Hiragino Sans',sans-serif;">
    <table role="presentation" width="100%" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;">
      <tr>
        <td style="padding:24px;">
          <h1 style="font-size:18px;margin:0 0 16px;color:#18181b;">${data.storeName} の混雑状況</h1>
          <p style="font-size:14px;margin:0 0 8px;color:${LEVEL_COLOR[data.level]};font-weight:bold;">
            ${LEVEL_LABEL[data.level]}
          </p>
          <p style="font-size:12px;margin:16px 0 0;color:#71717a;">
            レポート時刻: ${data.updatedAt}
          </p>
          ${actionButton}
        </td>
      </tr>
    </table>
  </body>
</html>
`.trim()
}
