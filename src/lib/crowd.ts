import { api, ApiError } from './api'
import type { ApiResult } from '../types/social'

export type CrowdReportLevel = 'low' | 'high'

export async function reportCrowdLevel(storeId: string, level: CrowdReportLevel): Promise<ApiResult> {
  try {
    await api.post('/api/crowd/report', { store_id: storeId, level })
    return { success: true }
  } catch (error) {
    return { success: false, message: error instanceof ApiError ? error.message : '混雑状況の報告に失敗しました' }
  }
}
