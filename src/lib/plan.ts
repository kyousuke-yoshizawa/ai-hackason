import { api } from './api'
import { toApiResult } from './toApiResult'
import type { ApiResult } from '../types/social'
import type { GeneratePlanResponse, PlanCandidate, PlanRequest } from '../types/plan'

export async function generatePlan(request: PlanRequest): Promise<ApiResult & { plan?: GeneratePlanResponse }> {
  const result = await toApiResult(
    api.post<GeneratePlanResponse>('/api/plan/generate', request),
    'プラン生成に失敗しました'
  )
  return result.success ? { success: true, plan: result.data } : result
}

// U006: 次回リクエストのhistoryに積む要約。フルJSONを積むとトークンを浪費するため、
// Claudeが前回の提案内容を思い出せる程度（label・立ち寄り先の店名と時刻）に絞る
export function summarizePlanForHistory(candidates: PlanCandidate[]): string {
  return candidates
    .map((candidate) => {
      const stops = candidate.stops
        .map((stop) => `${stop.start_time}-${stop.end_time} ${stop.store_name}`)
        .join('、')
      return stops ? `${candidate.label}: ${stops}` : `${candidate.label}: 立ち寄り先なし`
    })
    .join(' / ')
}
