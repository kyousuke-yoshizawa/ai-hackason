// optional フィールドを条件代入して更新オブジェクトを構築する。
// allowedKeys に含まれるキーのうち parsed 側で undefined でない値のみを採用する。
// 何も更新対象がなければ null を返す（呼び出し側で「更新内容がありません」等の400にする）。
export function buildPartialUpdate(
  parsed: Record<string, unknown>,
  allowedKeys: string[],
): Record<string, unknown> | null {
  const updates: Record<string, unknown> = {}

  for (const key of allowedKeys) {
    if (parsed[key] !== undefined) {
      updates[key] = parsed[key]
    }
  }

  if (Object.keys(updates).length === 0) {
    return null
  }

  updates.updated_at = new Date().toISOString()
  return updates
}
