import { api, ApiError } from './api'
import type { ApiResult } from '../types/social'
import type { CongestionLevel } from '../../shared/types/crowd'

export interface CrowdPatternEntry {
  day_of_week: number | null
  hour_of_day: number
  level: CongestionLevel
}

export async function getCrowdPatterns(storeId: string): Promise<ApiResult & { patterns: CrowdPatternEntry[] }> {
  try {
    const patterns = await api.get<CrowdPatternEntry[]>(`/api/crowd/patterns/${storeId}`)
    return { success: true, patterns }
  } catch (error) {
    return {
      success: false,
      message: error instanceof ApiError ? error.message : '混雑パターンの取得に失敗しました',
      patterns: [],
    }
  }
}

export async function replaceCrowdPatterns(
  storeId: string,
  patterns: CrowdPatternEntry[]
): Promise<ApiResult & { storeId?: string; count?: number }> {
  try {
    const result = await api.put<{ storeId: string; count: number }>(`/api/crowd/patterns/${storeId}`, patterns)
    return { success: true, storeId: result.storeId, count: result.count }
  } catch (error) {
    return { success: false, message: error instanceof ApiError ? error.message : '混雑パターンの保存に失敗しました' }
  }
}
