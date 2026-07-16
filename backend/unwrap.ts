// Supabase クエリ結果の { data, error } 定型句を集約するヘルパ。
// error があれば `${context}: ${error.message}` で throw し、なければ data を返す。
// 使用例: const rows = unwrap(await supabaseAdmin.from('likes').select('*'), 'listLikes')
//
// backend/db.ts とは別モジュールに分離している。多数の統合テストが
// `jest.mock('../../backend/db', () => ({ supabaseAdmin: fake }))` で db.ts を丸ごと
// モックするため、unwrap を db.ts に置くとそれらのテストでは undefined になってしまう。
export function unwrap<T>(result: { data: T | null; error: { message: string } | null }, context: string): T {
  if (result.error) {
    throw new Error(`${context}: ${result.error.message}`)
  }
  return result.data as T
}
