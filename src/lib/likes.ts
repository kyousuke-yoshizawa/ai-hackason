import { api, ApiError } from './api'
import type { ApiResult, Like, LikeWithStore } from '../types/social'

export async function addLike(userId: string, storeId: string): Promise<ApiResult & { like?: Like }> {
  try {
    const like = await api.post<Like>('/api/likes', { store_id: storeId })
    return { success: true, like }
  } catch (error) {
    return { success: false, message: error instanceof ApiError ? error.message : 'いいねに失敗しました' }
  }
}

export async function removeLikeByStore(userId: string, storeId: string): Promise<ApiResult> {
  try {
    await api.delete<void>(`/api/likes/${storeId}`)
    return { success: true }
  } catch (error) {
    return { success: false, message: error instanceof ApiError ? error.message : 'いいねの取消に失敗しました' }
  }
}

export async function getUserLikes(userId: string): Promise<ApiResult & { likes: LikeWithStore[] }> {
  try {
    const { data } = await api.get<{ data: LikeWithStore[] }>(`/api/likes/user/${userId}`)
    return { success: true, likes: data }
  } catch (error) {
    return {
      success: false,
      message: error instanceof ApiError ? error.message : 'いいね一覧の取得に失敗しました',
      likes: [],
    }
  }
}

export async function getStoreLikeCount(storeId: string): Promise<ApiResult & { count: number }> {
  try {
    const { count } = await api.get<{ count: number }>(`/api/stores/${storeId}/likes/count`)
    return { success: true, count }
  } catch (error) {
    return {
      success: false,
      message: error instanceof ApiError ? error.message : 'いいね数の取得に失敗しました',
      count: 0,
    }
  }
}

export async function isStoreLikedByUser(
  userId: string,
  storeId: string
): Promise<{ liked: boolean; likeId: string | null }> {
  try {
    return await api.get<{ liked: boolean; likeId: string | null }>(`/api/stores/${storeId}/likes/mine`)
  } catch {
    return { liked: false, likeId: null }
  }
}
