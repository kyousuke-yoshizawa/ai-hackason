import { useState } from 'react'
import { Modal } from './Modal'
import { createReservation } from '../lib/reservations'
import { useAuth } from '../context/AuthContext'
import type { Reservation } from '../types/reservation'

interface ReservationModalProps {
  isOpen: boolean
  onClose: () => void
  storeId: string
  storeName: string
  openTime?: string | null
  closeTime?: string | null
  onCreated?: (reservation: Reservation) => void
  onViewReservations?: () => void
}

const PARTY_SIZE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8]

function buildTimeSlots(openTime?: string | null, closeTime?: string | null): string[] {
  const [openH, openM] = (openTime ?? '10:00').split(':').map(Number)
  const [closeH, closeM] = (closeTime ?? '22:00').split(':').map(Number)
  const start = openH * 60 + openM
  const end = closeH * 60 + closeM

  const slots: string[] = []
  for (let m = start; m < end; m += 30) {
    const h = Math.floor(m / 60)
    const mm = m % 60
    slots.push(`${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`)
  }
  return slots
}

function todayIsoDate(): string {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  return new Date(now.getTime() - offset * 60 * 1000).toISOString().slice(0, 10)
}

export default function ReservationModal({
  isOpen,
  onClose,
  storeId,
  storeName,
  openTime,
  closeTime,
  onCreated,
  onViewReservations,
}: ReservationModalProps) {
  const { user } = useAuth()
  const timeSlots = buildTimeSlots(openTime, closeTime)
  const [date, setDate] = useState(todayIsoDate())
  const [time, setTime] = useState(timeSlots[0] ?? '')
  const [partySize, setPartySize] = useState(2)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState<Reservation | null>(null)

  if (!isOpen) return null

  const resetAndClose = () => {
    setConfirmed(null)
    setError(null)
    onClose()
  }

  const handleSubmit = async () => {
    if (!user) {
      setError('ログインが必要です')
      return
    }
    if (!time) {
      setError('時刻を選択してください')
      return
    }

    setError(null)
    setIsSubmitting(true)
    const result = await createReservation({
      storeId,
      userId: user.id,
      reservationDate: date,
      reservationTime: time,
      partySize,
    })
    setIsSubmitting(false)

    if (!result.success || !result.reservation) {
      setError(result.message ?? '予約に失敗しました')
      return
    }

    setConfirmed(result.reservation)
    onCreated?.(result.reservation)
  }

  if (confirmed) {
    return (
      <Modal title="予約が確定しました" onClose={resetAndClose}>
        <div className="text-center py-4">
          <p className="text-sm text-gray-600 mb-2">{storeName}</p>
          <p className="text-2xl font-bold text-indigo-600 mb-4">
            予約番号 #{confirmed.id.slice(0, 6).toUpperCase()}
          </p>
          <p className="text-sm text-gray-700">
            {confirmed.reservationDate} {confirmed.reservationTime} / {confirmed.partySize}名
          </p>
          <button
            type="button"
            onClick={() => {
              resetAndClose()
              onViewReservations?.()
            }}
            className="text-sm text-indigo-600 hover:underline mt-4"
          >
            キャンセルはここから
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title={`座席予約 - ${storeName}`} onClose={resetAndClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">日付</label>
          <input
            type="date"
            value={date}
            min={todayIsoDate()}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">時刻</label>
          <select
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            {timeSlots.map((slot) => (
              <option key={slot} value={slot}>
                {slot}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">人数</label>
          <select
            value={partySize}
            onChange={(e) => setPartySize(Number(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            {PARTY_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}人
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={resetAndClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-60"
          >
            {isSubmitting ? '予約中...' : '予約確定'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
