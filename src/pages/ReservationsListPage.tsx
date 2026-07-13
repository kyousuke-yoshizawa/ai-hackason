import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { cancelReservation, getUserReservations } from '../lib/reservations'
import type { AdminStore } from '../components/StoreForm'
import type { Reservation } from '../types/reservation'

interface ReservationsListPageProps {
  onBack: () => void
}

const STATUS_LABEL: Record<Reservation['status'], string> = {
  pending: '保留中',
  confirmed: '予約確定',
  cancelled: 'キャンセル済み',
}

export default function ReservationsListPage({ onBack }: ReservationsListPageProps) {
  const { user } = useAuth()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [storeNames, setStoreNames] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    const result = await getUserReservations(user.id)
    if (result.success) {
      const sorted = [...result.reservations].sort((a, b) =>
        `${a.reservationDate}T${a.reservationTime}`.localeCompare(`${b.reservationDate}T${b.reservationTime}`)
      )
      setReservations(sorted)
    } else {
      setError(result.message ?? '予約一覧の取得に失敗しました')
    }
    setIsLoading(false)
  }, [user])

  useEffect(() => {
    reload()
  }, [reload])

  useEffect(() => {
    api
      .get<{ data: AdminStore[] }>('/api/stores')
      .then((res) => {
        const map: Record<string, string> = {}
        res.data.forEach((s) => {
          map[s.id] = s.name
        })
        setStoreNames(map)
      })
      .catch(() => {
        // 店舗名が引けなくても予約一覧自体は表示できるようにする
      })
  }, [])

  const handleCancel = async (reservation: Reservation) => {
    const storeName = storeNames[reservation.storeId] ?? '店舗'
    if (!confirm(`${storeName}の予約（${reservation.reservationDate} ${reservation.reservationTime}）をキャンセルしますか？`)) {
      return
    }

    const result = await cancelReservation(reservation.id)
    if (!result.success) {
      setError(result.message ?? 'キャンセルに失敗しました')
      return
    }
    await reload()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button type="button" onClick={onBack} className="text-sm text-indigo-600 hover:underline">
            ← ダッシュボードに戻る
          </button>
          <h1 className="text-xl font-bold text-gray-900">予約一覧</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>
        )}

        {isLoading ? (
          <p className="text-gray-500 text-sm">読み込み中...</p>
        ) : reservations.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">まだ予約がありません</div>
        ) : (
          <ul className="space-y-3">
            {reservations.map((reservation) => (
              <li key={reservation.id} className="bg-white rounded-lg shadow p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-900">
                    {storeNames[reservation.storeId] ?? '（店舗情報なし）'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {reservation.reservationDate} {reservation.reservationTime} / {reservation.partySize}名
                  </p>
                  <p className="text-xs text-gray-500">
                    予約番号 #{reservation.id.slice(0, 6).toUpperCase()} ・{' '}
                    <span
                      className={reservation.status === 'cancelled' ? 'text-gray-400' : 'text-indigo-600'}
                    >
                      {STATUS_LABEL[reservation.status]}
                    </span>
                  </p>
                </div>
                {reservation.status === 'confirmed' && (
                  <button
                    type="button"
                    onClick={() => handleCancel(reservation)}
                    className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    キャンセル
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
