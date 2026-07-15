import { supabaseAdmin } from '../../db.js'

export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled'

export interface Reservation {
  id: string
  storeId: string
  userId: string
  reservationDate: string
  reservationTime: string
  partySize: number
  status: ReservationStatus
  createdAt: string
  cancelledAt: string | null
}

function toReservation(row: {
  id: string
  store_id: string
  user_id: string
  reservation_date: string
  reservation_time: string
  party_size: number
  status: ReservationStatus
  created_at: string
  cancelled_at: string | null
}): Reservation {
  return {
    id: row.id,
    storeId: row.store_id,
    userId: row.user_id,
    reservationDate: row.reservation_date,
    reservationTime: row.reservation_time,
    partySize: row.party_size,
    status: row.status,
    createdAt: row.created_at,
    cancelledAt: row.cancelled_at,
  }
}

export interface StoreBusinessHours {
  name: string
  openTime: string | null
  closeTime: string | null
}

export async function getStoreBusinessHours(storeId: string): Promise<StoreBusinessHours | null> {
  const { data, error } = await supabaseAdmin
    .from('stores')
    .select('name, open_time, close_time')
    .eq('id', storeId)
    .single()

  if (error || !data) return null

  return { name: data.name, openTime: data.open_time, closeTime: data.close_time }
}

export interface ReservationSettings {
  maxCapacity: number | null
  bookingAdvanceHours: number
}

export async function getReservationSettings(storeId: string): Promise<ReservationSettings> {
  const { data, error } = await supabaseAdmin
    .from('reservation_settings')
    .select('max_capacity, booking_advance_hours')
    .eq('store_id', storeId)
    .single()

  if (error || !data) {
    return { maxCapacity: null, bookingAdvanceHours: 0 }
  }

  return { maxCapacity: data.max_capacity, bookingAdvanceHours: data.booking_advance_hours }
}

export async function getConfirmedPartySizeForSlot(
  storeId: string,
  reservationDate: string,
  reservationTime: string,
): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('reservations')
    .select('party_size')
    .eq('store_id', storeId)
    .eq('reservation_date', reservationDate)
    .eq('reservation_time', reservationTime)
    .eq('status', 'confirmed')

  if (error) {
    throw new Error(`Failed to sum reserved party size: ${error.message}`)
  }

  return (data ?? []).reduce((sum, row) => sum + row.party_size, 0)
}

export interface CreateReservationInput {
  storeId: string
  userId: string
  reservationDate: string
  reservationTime: string
  partySize: number
}

export async function createReservation(input: CreateReservationInput): Promise<Reservation> {
  const { data, error } = await supabaseAdmin
    .from('reservations')
    .insert({
      store_id: input.storeId,
      user_id: input.userId,
      reservation_date: input.reservationDate,
      reservation_time: input.reservationTime,
      party_size: input.partySize,
      status: 'confirmed',
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Failed to create reservation: ${error?.message ?? 'unknown error'}`)
  }

  return toReservation(data)
}

export async function getReservationById(id: string): Promise<Reservation | null> {
  const { data, error } = await supabaseAdmin.from('reservations').select('*').eq('id', id).single()

  if (error || !data) return null

  return toReservation(data)
}

export async function cancelReservation(id: string): Promise<Reservation> {
  const { data, error } = await supabaseAdmin
    .from('reservations')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Failed to cancel reservation: ${error?.message ?? 'unknown error'}`)
  }

  return toReservation(data)
}

export async function listUserReservations(userId: string): Promise<Reservation[]> {
  const { data, error } = await supabaseAdmin
    .from('reservations')
    .select('*')
    .eq('user_id', userId)
    .order('reservation_date', { ascending: true })

  if (error) {
    throw new Error(`Failed to list user reservations: ${error.message}`)
  }

  return (data ?? []).map(toReservation)
}

export async function listStoreReservations(storeId: string): Promise<Reservation[]> {
  const { data, error } = await supabaseAdmin
    .from('reservations')
    .select('*')
    .eq('store_id', storeId)
    .order('reservation_date', { ascending: true })

  if (error) {
    throw new Error(`Failed to list store reservations: ${error.message}`)
  }

  return (data ?? []).map(toReservation)
}
