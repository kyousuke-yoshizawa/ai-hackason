import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { cancelReservation, getUserReservations } from '../lib/reservations'
import { useApiQuery } from '../hooks/useApiQuery'
import { PageHeader } from '../components/ui/PageHeader'
import { LoadingText } from '../components/ui/LoadingText'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { EmptyCard } from '../components/ui/EmptyCard'
import type { AdminStore } from '../components/StoreForm'
import type { Reservation } from '../types/reservation'
import Cloud from '../components/decor/Cloud'
import Leaf from '../components/decor/Leaf'

const STATUS_LABEL: Record<Reservation['status'], string> = {
  pending: '保留中',
  confirmed: '予約確定',
  cancelled: 'キャンセル済み',
}

export default function ReservationsListPage() {
  const { user } = useAuth()
  const [storeNames, setStoreNames] = useState<Record<string, string>>({})
  const [operationError, setOperationError] = useState<string | null>(null)

  const {
    data: reservationsData,
    isLoading,
    error: loadError,
    reload,
  } = useApiQuery(
    async () => {
      const result = await getUserReservations(user!.id)
      if (!result.success) throw new Error(result.message ?? '予約一覧の取得に失敗しました')
      return [...result.reservations].sort((a, b) =>
        `${a.reservationDate}T${a.reservationTime}`.localeCompare(`${b.reservationDate}T${b.reservationTime}`)
      )
    },
    [user?.id],
    { enabled: !!user, fallbackMessage: '予約一覧の取得に失敗しました' }
  )
  const reservations = reservationsData ?? []
  const error = operationError ?? loadError

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
      setOperationError(result.message ?? 'キャンセルに失敗しました')
      return
    }
    await reload()
  }

  return (
    <div className="ac-page-bg">
      <PageHeader
        title="予約一覧"
        backTo="/dashboard"
        decor={<Cloud className="absolute right-6 top-2 h-8 w-16 opacity-30" />}
      />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {error && <ErrorBanner message={error} />}

        {isLoading ? (
          <LoadingText />
        ) : reservations.length === 0 ? (
          <EmptyCard message="まだ予約がありません" decor={<Leaf className="absolute -top-4 -left-4 h-9 w-9 -rotate-12 drop-shadow" />} />
        ) : (
          <ul className="space-y-3">
            {reservations.map((reservation) => (
              <li key={reservation.id} className="ac-card-sm flex justify-between items-center">
                <div>
                  <p className="font-bold text-wood-800">
                    {storeNames[reservation.storeId] ?? '（店舗情報なし）'}
                  </p>
                  <p className="text-sm text-wood-600">
                    {reservation.reservationDate} {reservation.reservationTime} / {reservation.partySize}名
                  </p>
                  <p className="text-xs text-wood-400">
                    予約番号 #{reservation.id.slice(0, 6).toUpperCase()} ・{' '}
                    <span
                      className={`ac-badge ${
                        reservation.status === 'cancelled'
                          ? 'bg-wood-100 text-wood-400'
                          : 'bg-leaf-100 text-leaf-700'
                      }`}
                    >
                      {STATUS_LABEL[reservation.status]}
                    </span>
                  </p>
                </div>
                {reservation.status === 'confirmed' && (
                  <button
                    type="button"
                    onClick={() => handleCancel(reservation)}
                    className="ac-btn-danger !px-4 !py-2 text-sm"
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
