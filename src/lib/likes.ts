import { supabase } from './supabase'
import type { ApiResult, Like, LikeWithStore } from '../types/social'

const UNIQUE_VIOLATION = '23505'

export async function addLike(userId: string, storeId: string): Promise<ApiResult & { like?: Like }> {
  const { data, error } = await supabase
    .from('likes')
    .insert({ user_id: userId, store_id: storeId })
    .select()
    .single()

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { success: false, message: 'すでにいいね済みです' }
    }
    return { success: false, message: error.message }
  }

  return { success: true, like: data as Like }
}

export async function removeLikeByStore(userId: string, storeId: string): Promise<ApiResult> {
  const { error } = await supabase
    .from('likes')
    .delete()
    .eq('user_id', userId)
    .eq('store_id', storeId)

  if (error) return { success: false, message: error.message }
  return { success: true }
}

export async function removeLike(likeId: string): Promise<ApiResult> {
  const { error } = await supabase.from('likes').delete().eq('id', likeId)
  if (error) return { success: false, message: error.message }
  return { success: true }
}

export async function getUserLikes(
  userId: string
): Promise<ApiResult & { likes: LikeWithStore[] }> {
  const { data, error } = await supabase
    .from('likes')
    .select('*, stores(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) return { success: false, message: error.message, likes: [] }
  return { success: true, likes: (data ?? []) as unknown as LikeWithStore[] }
}

export async function getStoreLikeCount(storeId: string): Promise<ApiResult & { count: number }> {
  const { count, error } = await supabase
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('store_id', storeId)

  if (error) return { success: false, message: error.message, count: 0 }
  return { success: true, count: count ?? 0 }
}

export async function isStoreLikedByUser(
  userId: string,
  storeId: string
): Promise<{ liked: boolean; likeId: string | null }> {
  const { data, error } = await supabase
    .from('likes')
    .select('id')
    .eq('user_id', userId)
    .eq('store_id', storeId)
    .maybeSingle()

  if (error || !data) return { liked: false, likeId: null }
  return { liked: true, likeId: data.id as string }
}
