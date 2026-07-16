import { CROWD_LEVEL_LABEL, type CongestionLevel } from '../crowd/types.js'

export interface CongestionReportLink {
  level: CongestionLevel
  url: string
}

export interface CongestionReportData {
  storeName: string
  level: CongestionLevel
  updatedAt: string
  reportLinks?: CongestionReportLink[]
}

const LEVEL_COLOR: Record<CongestionLevel, string> = {
  low: '#16a34a',
  medium: '#d97706',
  high: '#dc2626',
}

export function renderCongestionReportSubject(data: CongestionReportData): string {
  return `【混雑通知】${data.storeName} は現在${CROWD_LEVEL_LABEL[data.level]}`
}

export function renderCongestionReportHtml(data: CongestionReportData): string {
  const reportButtons = data.reportLinks?.length
    ? `<p style="margin:24px 0 0;font-size:13px;color:#3f3f46;">混雑状態を報告してください</p>
       <p style="margin:8px 0 0;">
         ${data.reportLinks
           .map(
             (link) => `<a href="${link.url}" style="display:inline-block;margin:0 4px 8px 0;padding:10px 16px;background:${LEVEL_COLOR[link.level]};color:#ffffff;border-radius:6px;text-decoration:none;font-size:14px;">
           ${CROWD_LEVEL_LABEL[link.level]}
         </a>`,
           )
           .join('')}
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
            ${CROWD_LEVEL_LABEL[data.level]}
          </p>
          <p style="font-size:12px;margin:16px 0 0;color:#71717a;">
            レポート時刻: ${data.updatedAt}
          </p>
          ${reportButtons}
        </td>
      </tr>
    </table>
  </body>
</html>
`.trim()
}
