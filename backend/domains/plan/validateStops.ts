import type { GeneratePlanResponse } from './schema.js'

type PlanCandidate = GeneratePlanResponse['candidates'][number]
type PlanStop = PlanCandidate['stops'][number]

export interface ReconcileStopsResult {
  candidates: PlanCandidate[]
  warnings: string[]
}

// Issue #120（幻覚store_id対策）: Claudeがstore_idをtypo・自作した場合、MapView等の
// store_idベースの座標突き合わせが壊れる。promptBuilder側の予防的な指示（一字一句そのまま
// 使うこと）だけでは防ぎきれない前提で、応答側でも店舗マスタと照合して補正・除去する。
//
// 4分岐:
// 1. store_idが実在 → store_nameがマスタと異なれば表記揺れとしてマスタ名で上書き
// 2. store_idが不在だがstore_name完全一致の店舗がある → LLMはIDよりも名前を正確に
//    引用できることが多いという想定で、IDをマスタ値から復元する
// 3. どちらも解決不能 → そのstopを除去し、warningsに記録する
// 4. stopsが空になったcandidateはプラン案として提示できないため除去する
export function reconcileStops(
  candidates: PlanCandidate[],
  stores: { id: string; name: string }[]
): ReconcileStopsResult {
  const warnings: string[] = []
  const storeById = new Map(stores.map((store) => [store.id, store]))
  const storeByName = new Map(stores.map((store) => [store.name, store]))

  const reconciledCandidates = candidates
    .map((candidate) => ({
      ...candidate,
      stops: candidate.stops
        .map((stop) => reconcileStop(stop, storeById, storeByName, warnings))
        .filter((stop): stop is PlanStop => stop !== null),
    }))
    .filter((candidate) => candidate.stops.length > 0)

  return { candidates: reconciledCandidates, warnings }
}

function reconcileStop(
  stop: PlanStop,
  storeById: Map<string, { id: string; name: string }>,
  storeByName: Map<string, { id: string; name: string }>,
  warnings: string[]
): PlanStop | null {
  const byId = storeById.get(stop.store_id)
  if (byId) {
    if (byId.name !== stop.store_name) {
      warnings.push(
        `store_id "${stop.store_id}" のstore_name表記が店舗マスタと異なるため上書きしました（"${stop.store_name}" → "${byId.name}"）`
      )
      return { ...stop, store_name: byId.name }
    }
    return stop
  }

  const byName = storeByName.get(stop.store_name)
  if (byName) {
    warnings.push(
      `store_id "${stop.store_id}" が店舗マスタに実在しないため、store_name "${stop.store_name}" から復元しました（→ "${byName.id}"）`
    )
    return { ...stop, store_id: byName.id, store_name: byName.name }
  }

  warnings.push(
    `store_id "${stop.store_id}" / store_name "${stop.store_name}" のいずれも店舗マスタと一致しないため、このstopを除去しました`
  )
  return null
}
