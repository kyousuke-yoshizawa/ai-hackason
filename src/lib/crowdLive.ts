// ライブ混雑報告（crowd_status由来）の残効時間を計算する（Issue #134）

/**
 * 混雑報告からの残り有効分数を返す。
 * - reportedAt が null（パターン由来・未報告）なら null
 * - 経過分数が ttlMinutes 以上なら 0（失効）
 * - それ以外は残り分数（切り上げ）
 */
export function remainingMinutes(reportedAt: string | null, now: Date, ttlMinutes = 30): number | null {
  if (reportedAt === null) return null

  const elapsedMinutes = (now.getTime() - new Date(reportedAt).getTime()) / 60000
  if (elapsedMinutes >= ttlMinutes) return 0

  return Math.ceil(ttlMinutes - elapsedMinutes)
}
