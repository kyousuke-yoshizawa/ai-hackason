import { api, ApiError } from './api'
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
  try {
    const reservation = await api.post<Reservation>('/api/reservations', {
      store_id: input.storeId,
      user_id: input.userId,
      reservation_date: input.reservationDate,
      reservation_time: input.reservationTime,
      party_size: input.partySize,
    })
    return { success: true, reservation }
  } catch (error) {
    return { success: false, message: error instanceof ApiError ? error.message : '予約に失敗しました' }
  }
}

export async function getUserReservations(userId: string): Promise<ApiResult & { reservations: Reservation[] }> {
  try {
    const reservations = await api.get<Reservation[]>(`/api/reservations/user/${userId}`)
    return { success: true, reservations }
  } catch (error) {
    return { success: false, message: error instanceof ApiError ? error.message : '予約一覧の取得に失敗しました', reservations: [] }
  }
}

export async function cancelReservation(id: string): Promise<ApiResult & { reservation?: Reservation }> {
  try {
    const reservation = await api.put<Reservation>(`/api/reservations/${id}`, {})
    return { success: true, reservation }
  } catch (error) {
    return { success: false, message: error instanceof ApiError ? error.message : 'キャンセルに失敗しました' }
  }
}
