import {
  getConfirmedPartySizeForSlot,
  getReservationSettings,
  getStoreBusinessHours,
} from './repository.js'

export type ReservationValidationError =
  | 'invalid_input'
  | 'store_not_found'
  | 'outside_business_hours'
  | 'too_soon'
  | 'capacity_exceeded'

export type ReservationValidationResult =
  | { valid: true }
  | { valid: false; reason: ReservationValidationError; message: string }

export interface ReservationRequestInput {
  storeId: string
  reservationDate: string
  reservationTime: string
  partySize: number
}

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

export async function validateReservationRequest(
  input: ReservationRequestInput,
  now: Date = new Date(),
): Promise<ReservationValidationResult> {
  if (!input.partySize || input.partySize <= 0) {
    return { valid: false, reason: 'invalid_input', message: '予約人数は1人以上を指定してください。' }
  }

  const store = await getStoreBusinessHours(input.storeId)
  if (!store) {
    return { valid: false, reason: 'store_not_found', message: '店舗が見つかりません。' }
  }

  if (store.openTime && store.closeTime) {
    const requestedMinutes = parseTimeToMinutes(input.reservationTime)
    const openMinutes = parseTimeToMinutes(store.openTime)
    const closeMinutes = parseTimeToMinutes(store.closeTime)
    if (requestedMinutes < openMinutes || requestedMinutes >= closeMinutes) {
      return { valid: false, reason: 'outside_business_hours', message: '営業時間外の予約はできません。' }
    }
  }

  const settings = await getReservationSettings(input.storeId)

  const requestedAt = new Date(`${input.reservationDate}T${input.reservationTime}`)
  const advanceHours = (requestedAt.getTime() - now.getTime()) / (60 * 60 * 1000)
  if (advanceHours < settings.bookingAdvanceHours) {
    return {
      valid: false,
      reason: 'too_soon',
      message: `予約は${settings.bookingAdvanceHours}時間前までにお願いします。`,
    }
  }

  if (settings.maxCapacity !== null) {
    const existingPartySize = await getConfirmedPartySizeForSlot(
      input.storeId,
      input.reservationDate,
      input.reservationTime,
    )
    if (existingPartySize + input.partySize > settings.maxCapacity) {
      return { valid: false, reason: 'capacity_exceeded', message: 'この時間帯は満席のため予約できません。' }
    }
  }

  return { valid: true }
}
