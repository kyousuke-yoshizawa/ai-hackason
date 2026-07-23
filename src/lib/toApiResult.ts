import { ApiError } from './api'

// src/lib/{likes,reviews,reservations,plan}.ts に重複していた
// 「try/catch → {success, message} 変換」を集約するユーティリティ（Issue #106）。
export async function toApiResult<T>(
  promise: Promise<T>,
  fallbackMessage: string
): Promise<{ success: true; data: T } | { success: false; message: string }> {
  try {
    return { success: true, data: await promise }
  } catch (error) {
    return {
      success: false,
      message: error instanceof ApiError ? error.message : fallbackMessage,
    }
  }
}
