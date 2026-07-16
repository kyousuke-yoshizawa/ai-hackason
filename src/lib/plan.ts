import { api } from './api'
import { toApiResult } from './toApiResult'
import type { ApiResult } from '../types/social'
import type { GeneratePlanResponse, PlanRequest } from '../types/plan'

export async function generatePlan(request: PlanRequest): Promise<ApiResult & { plan?: GeneratePlanResponse }> {
  const result = await toApiResult(
    api.post<GeneratePlanResponse>('/api/plan/generate', request),
    'プラン生成に失敗しました'
  )
  return result.success ? { success: true, plan: result.data } : result
}
