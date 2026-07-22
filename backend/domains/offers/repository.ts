import { supabaseAdmin } from '../../db.js'
import { unwrap } from '../../unwrap.js'
import type { CreateOfferInput } from './schema.js'

export interface OfferRow {
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

export async function listOffersByStore(storeId: string): Promise<OfferRow[]> {
  return (unwrap(
    await supabaseAdmin.from('offers').select('*').eq('store_id', storeId).order('start_time', { ascending: true }),
    'listOffersByStore',
  ) ?? []) as OfferRow[]
}

// プラン生成（api/plan/generate.ts）が店舗ごとに問い合わせず1回で全店舗分のオファーを取得する
// ための一括取得。#105（プラン生成のN+1回避）と同じ方針で、店舗数ぶんループ問い合わせしない
export async function listActiveOffers(): Promise<OfferRow[]> {
  return (unwrap(
    await supabaseAdmin.from('offers').select('*').eq('is_active', true),
    'listActiveOffers',
  ) ?? []) as OfferRow[]
}

export async function getOfferById(id: string): Promise<OfferRow | null> {
  const { data, error } = await supabaseAdmin.from('offers').select('*').eq('id', id).single()
  if (error || !data) return null
  return data as OfferRow
}

export async function createOffer(input: CreateOfferInput): Promise<OfferRow> {
  return unwrap(
    await supabaseAdmin
      .from('offers')
      .insert({
        store_id: input.store_id,
        description: input.description,
        start_time: input.start_time,
        end_time: input.end_time,
        weekdays_only: input.weekdays_only ?? false,
        is_active: input.is_active ?? true,
      })
      .select()
      .single(),
    'createOffer',
  ) as OfferRow
}

// updates は呼び出し側（server/routes/offers.ts）が buildPartialUpdate（backend/http/partialUpdate.ts）で
// 組み立てた「変更対象キーのみ＋updated_at」のオブジェクトを渡す想定
export async function updateOffer(id: string, updates: Record<string, unknown>): Promise<OfferRow> {
  return unwrap(
    await supabaseAdmin.from('offers').update(updates).eq('id', id).select().single(),
    'updateOffer',
  ) as OfferRow
}

export async function deleteOffer(id: string): Promise<void> {
  unwrap(await supabaseAdmin.from('offers').delete().eq('id', id), 'deleteOffer')
}
