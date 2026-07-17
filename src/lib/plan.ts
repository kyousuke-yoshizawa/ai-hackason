import { api, ApiError } from './api'
import type { ApiResult } from '../types/social'
import type { GeneratePlanResponse, PlanCandidate, PlanRequest } from '../types/plan'

export async function generatePlan(request: PlanRequest): Promise<ApiResult & { plan?: GeneratePlanResponse }> {
  try {
    const plan = await api.post<GeneratePlanResponse>('/api/plan/generate', request)
    return { success: true, plan }
  } catch (error) {
    return { success: false, message: error instanceof ApiError ? error.message : 'プラン生成に失敗しました' }
  }
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
