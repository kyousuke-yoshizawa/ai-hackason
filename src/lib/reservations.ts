import { api } from './api'
import { toApiResult } from './toApiResult'
import type { ApiResult } from '../types/social'
import type { Reservation } from '../types/reservation'

export interface CreateReservationInput {
  storeId: string
  userId: string
  reservationDate: string
  reservationTime: string
  partySize: number
}

export async function createReservation(
  input: CreateReservationInput
): Promise<ApiResult & { reservation?: Reservation }> {
  const result = await toApiResult(
    api.post<Reservation>('/api/reservations', {
      store_id: input.storeId,
      user_id: input.userId,
      reservation_date: input.reservationDate,
      reservation_time: input.reservationTime,
      party_size: input.partySize,
    }),
    '予約に失敗しました'
  )
  return result.success ? { success: true, reservation: result.data } : result
}

export async function getUserReservations(userId: string): Promise<ApiResult & { reservations: Reservation[] }> {
  const result = await toApiResult(
    api.get<Reservation[]>(`/api/reservations/user/${userId}`),
    '予約一覧の取得に失敗しました'
  )
  return result.success ? { success: true, reservations: result.data } : { ...result, reservations: [] }
}

export async function cancelReservation(id: string): Promise<ApiResult & { reservation?: Reservation }> {
  const result = await toApiResult(api.put<Reservation>(`/api/reservations/${id}`, {}), 'キャンセルに失敗しました')
  return result.success ? { success: true, reservation: result.data } : result
}
