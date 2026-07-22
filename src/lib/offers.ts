import { api, ApiError } from './api'
import type { ApiResult } from '../types/social'

export interface Offer {
  id: string
  store_id: string
  description: string
  start_time: string
  end_time: string
  weekdays_only: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateOfferInput {
  store_id: string
  description: string
  start_time: string
  end_time: string
  weekdays_only?: boolean
  is_active?: boolean
}

export type UpdateOfferInput = Partial<Omit<CreateOfferInput, 'store_id'>>

export async function getOffers(storeId: string): Promise<ApiResult & { offers: Offer[] }> {
  try {
    const res = await api.get<{ data: Offer[] }>(`/api/offers?store_id=${encodeURIComponent(storeId)}`)
    return { success: true, offers: res.data }
  } catch (error) {
    return {
      success: false,
      message: error instanceof ApiError ? error.message : 'オファーの取得に失敗しました',
      offers: [],
    }
  }
}

export async function createOffer(input: CreateOfferInput): Promise<ApiResult & { offer?: Offer }> {
  try {
    const offer = await api.post<Offer>('/api/offers', input)
    return { success: true, offer }
  } catch (error) {
    return { success: false, message: error instanceof ApiError ? error.message : 'オファーの作成に失敗しました' }
  }
}

export async function updateOffer(id: string, input: UpdateOfferInput): Promise<ApiResult & { offer?: Offer }> {
  try {
    const offer = await api.put<Offer>(`/api/offers/${id}`, input)
    return { success: true, offer }
  } catch (error) {
    return { success: false, message: error instanceof ApiError ? error.message : 'オファーの更新に失敗しました' }
  }
}

export async function deleteOffer(id: string): Promise<ApiResult> {
  try {
    await api.delete(`/api/offers/${id}`)
    return { success: true }
  } catch (error) {
    return { success: false, message: error instanceof ApiError ? error.message : 'オファーの削除に失敗しました' }
  }
}
