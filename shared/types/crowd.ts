export type CongestionLevel = 'low' | 'medium' | 'high'

// 混雑度ラベルの唯一の定義（画面・メール共通）。Issue #109: 4ファイルに別文言で
// 定義されていたものを統一。
export const CROWD_LEVEL_LABEL: Record<CongestionLevel, string> = {
  low: '空いている',
  medium: '普通',
  high: '混雑',
}
