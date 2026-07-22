import { supabaseAdmin } from '../../db.js'

/**
 * プラン生成（api/plan/generate.ts）が候補に含めた店舗の「提案回数」を記録する（Issue #136）。
 * 店舗ダッシュボードの表示のための補助的な集計であり、記録に失敗してもプラン生成そのものを
 * 失敗させたくないため、例外を外へ投げず console.warn に留める。
 */
export async function recordPlanSuggestions(storeIds: string[]): Promise<void> {
  const uniqueStoreIds = [...new Set(storeIds)]
  if (uniqueStoreIds.length === 0) {
    return
  }

  try {
    const { error } = await supabaseAdmin
      .from('plan_suggestions')
      .insert(uniqueStoreIds.map((storeId) => ({ store_id: storeId })))

    if (error) {
      console.warn('recordPlanSuggestions: insertに失敗しました', error.message)
    }
  } catch (err) {
    console.warn('recordPlanSuggestions: 予期しないエラーが発生しました', err)
  }
}

/**
 * 指定した店舗ID群について、sinceJstMidnight以降に記録されたplan_suggestionsの件数を
 * store_idごとに集計して返す（Issue #136）。#105のN+1回避パターンに合わせ、
 * storeIds分ループ問い合わせせず1クエリで取得してからJS側で集計する。
 * enrichStoresWithAggregatesから呼ばれるため、店舗一覧APIの成否に影響しないよう
 * 失敗時は例外を投げず空のMapを返す（storeThumbnails.getThumbnailUrlsForStoresと同じ方針）。
 */
export async function getSuggestionCounts(
  storeIds: string[],
  sinceJstMidnight: Date,
): Promise<Map<string, number>> {
  const uniqueStoreIds = [...new Set(storeIds)]
  const counts = new Map<string, number>()
  if (uniqueStoreIds.length === 0) {
    return counts
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('plan_suggestions')
      .select('store_id')
      .in('store_id', uniqueStoreIds)
      .gte('suggested_at', sinceJstMidnight.toISOString())

    if (error) {
      console.warn('getSuggestionCounts: 取得に失敗しました', error.message)
      return counts
    }

    for (const row of (data ?? []) as { store_id: string }[]) {
      counts.set(row.store_id, (counts.get(row.store_id) ?? 0) + 1)
    }
    return counts
  } catch (err) {
    console.warn('getSuggestionCounts: 予期しないエラーが発生しました', err)
    return counts
  }
}
