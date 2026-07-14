import { api, ApiError } from './api'
import type { ApiResult } from '../types/social'
import type { GeneratePlanResponse, PlanRequest } from '../types/plan'

export async function generatePlan(request: PlanRequest): Promise<ApiResult & { plan?: GeneratePlanResponse }> {
  try {
    const plan = await api.post<GeneratePlanResponse>('/api/plan/generate', request)
    return { success: true, plan }
  } catch (error) {
    return { success: false, message: error instanceof ApiError ? error.message : 'プラン生成に失敗しました' }
  }
}
