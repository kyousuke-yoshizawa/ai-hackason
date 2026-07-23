// Issue #138: 意図解析結果の確認バッジ表示用。desires文字列に含まれるキーワードから
// 絵文字を引く簡易マップ（完全一致ではなく部分一致で判定する。マップ外は📍）
const DESIRE_ICON_RULES: [string, string][] = [
  ['ランチ', '🍽'],
  ['昼食', '🍽'],
  ['ディナー', '🍽'],
  ['食事', '🍽'],
  ['映画', '🎬'],
  ['カフェ', '☕'],
  ['買い物', '🛍'],
  ['ショッピング', '🛍'],
  ['公園', '🌳'],
  ['散歩', '🌳'],
  ['雑貨', '🛍'],
  ['スイーツ', '🍰'],
  ['甘いもの', '🍰'],
]

export function iconForDesire(desire: string): string {
  const rule = DESIRE_ICON_RULES.find(([keyword]) => desire.includes(keyword))
  return rule ? rule[1] : '📍'
}
