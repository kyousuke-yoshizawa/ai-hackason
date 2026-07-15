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
          <p className="text-sm text-wood-500 mb-2">{storeName}</p>
          <p className="text-2xl font-extrabold text-leaf-600 mb-4">
            予約番号 #{confirmed.id.slice(0, 6).toUpperCase()}
          </p>
          <p className="text-sm text-wood-700 font-bold">
            {confirmed.reservationDate} {confirmed.reservationTime} / {confirmed.partySize}名
          </p>
          <button
            type="button"
            onClick={() => {
              resetAndClose()
              onViewReservations?.()
            }}
            className="text-sm font-bold text-leaf-700 hover:underline mt-4"
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
          <label className="ac-label">日付</label>
          <input
            type="date"
            value={date}
            min={todayIsoDate()}
            onChange={(e) => setDate(e.target.value)}
            className="ac-input"
          />
        </div>

        <div>
          <label className="ac-label">時刻</label>
          <select value={time} onChange={(e) => setTime(e.target.value)} className="ac-input">
            {timeSlots.map((slot) => (
              <option key={slot} value={slot}>
                {slot}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="ac-label">人数</label>
          <select
            value={partySize}
            onChange={(e) => setPartySize(Number(e.target.value))}
            className="ac-input"
          >
            {PARTY_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}人
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="rounded-2xl border-2 border-bubble-200 bg-bubble-50 p-3">
            <p className="text-sm font-bold text-bubble-700">{error}</p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={resetAndClose} className="ac-btn-secondary !px-4 !py-2 text-sm">
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="ac-btn-primary !px-4 !py-2 text-sm"
          >
            {isSubmitting ? '予約中...' : '予約確定'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
