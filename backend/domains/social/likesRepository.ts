import { supabaseAdmin } from '../../db.js'
import type { Like, LikeWithStore, StoreRef } from '../../../shared/types/social.js'

export type { Like, LikeWithStore, StoreRef }

const UNIQUE_VIOLATION = '23505'

export type AddLikeResult = { duplicate: true } | { duplicate: false; like: Like }

export async function addLike(userId: string, storeId: string): Promise<AddLikeResult> {
  const { data, error } = await supabaseAdmin
    .from('likes')
    .insert({ user_id: userId, store_id: storeId })
    .select()
    .single()

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { duplicate: true }
    }
    throw new Error(error.message)
  }

  return { duplicate: false, like: data as Like }
}

export async function removeLikeByStore(userId: string, storeId: string): Promise<void> {
  const { error } = await supabaseAdmin.from('likes').delete().eq('user_id', userId).eq('store_id', storeId)
  if (error) throw new Error(error.message)
}

export async function getUserLikes(userId: string): Promise<LikeWithStore[]> {
  const { data, error } = await supabaseAdmin
    .from('likes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  const likes = (data ?? []) as Like[]

  const storeIds = [...new Set(likes.map((like) => like.store_id))]
  const storesById = new Map<string, StoreRef>()
  if (storeIds.length > 0) {
    const { data: stores, error: storesError } = await supabaseAdmin
      .from('stores')
      .select('id, name, category')
      .in('id', storeIds)
    if (storesError) throw new Error(storesError.message)
    for (const store of (stores ?? []) as StoreRef[]) {
      storesById.set(store.id, store)
    }
  }

  return likes.map((like) => ({ ...like, stores: storesById.get(like.store_id) ?? null }))
}

export async function getStoreLikeCount(storeId: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('store_id', storeId)

  if (error) throw new Error(error.message)
  return count ?? 0
}

export async function isStoreLikedByUser(
  userId: string,
  storeId: string,
): Promise<{ liked: boolean; likeId: string | null }> {
  const { data, error } = await supabaseAdmin
    .from('likes')
    .select('id')
    .eq('user_id', userId)
    .eq('store_id', storeId)
    .maybeSingle()

  if (error || !data) return { liked: false, likeId: null }
  return { liked: true, likeId: (data as { id: string }).id }
}
