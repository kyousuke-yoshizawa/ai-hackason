import type { PlanCandidate } from './schema.js'

/**
 * 全candidatesのstopsから、プラン提案回数記録（Issue #136）向けに重複しない
 * store_id配列を抽出する。同じ店舗が複数候補・複数stopに登場しても1回として数える。
 */
export function collectStoreIdsFromCandidates(candidates: PlanCandidate[]): string[] {
  const storeIds = new Set<string>()
  for (const candidate of candidates) {
    for (const stop of candidate.stops) {
      storeIds.add(stop.store_id)
    }
  }
  return [...storeIds]
}
