import { api } from './api'
import { toApiResult } from './toApiResult'
import type { ApiResult, Like, LikeWithStore } from '../types/social'

export async function addLike(userId: string, storeId: string): Promise<ApiResult & { like?: Like }> {
  const result = await toApiResult(api.post<Like>('/api/likes', { store_id: storeId }), 'いいねに失敗しました')
  return result.success ? { success: true, like: result.data } : result
}

export async function removeLikeByStore(userId: string, storeId: string): Promise<ApiResult> {
  const result = await toApiResult(api.delete<void>(`/api/likes/${storeId}`), 'いいねの取消に失敗しました')
  return result.success ? { success: true } : result
}

export async function getUserLikes(userId: string): Promise<ApiResult & { likes: LikeWithStore[] }> {
  const result = await toApiResult(
    api.get<{ data: LikeWithStore[] }>(`/api/likes/user/${userId}`),
    'いいね一覧の取得に失敗しました'
  )
  return result.success ? { success: true, likes: result.data.data } : { ...result, likes: [] }
}

export async function getStoreLikeCount(storeId: string): Promise<ApiResult & { count: number }> {
  const result = await toApiResult(
    api.get<{ count: number }>(`/api/stores/${storeId}/likes/count`),
    'いいね数の取得に失敗しました'
  )
  return result.success ? { success: true, count: result.data.count } : { ...result, count: 0 }
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
