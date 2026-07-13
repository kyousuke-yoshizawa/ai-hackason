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
