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

const WEEKDAY_DAYS = new Set([1, 2, 3, 4, 5])

function toHHMM(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

// Issue #135（オファーのプラン反映プレビュー）: バックエンド版
// backend/domains/offers/activeCheck.ts の簡易版。あちらはJST基準で厳密に判定するが、
// こちらは店舗管理画面のプレビュー表示専用のためブラウザのローカル時刻をそのまま使う
// （店舗運用は基本JSTのため実用上のズレは許容範囲）。
export function isOfferActiveNow(
  offer: { start_time: string; end_time: string; weekdays_only: boolean; is_active: boolean },
  now: Date = new Date()
): boolean {
  if (!offer.is_active) return false
  if (offer.weekdays_only && !WEEKDAY_DAYS.has(now.getDay())) return false

  const current = toHHMM(now)
  // "HH:MM" はzero-padded文字列同士なので、文字列比較で時刻の大小関係が保たれる
  return current >= offer.start_time && current <= offer.end_time
}

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
