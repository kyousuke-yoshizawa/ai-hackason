import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { cancelReservation, getUserReservations } from '../lib/reservations'
import type { AdminStore } from '../components/StoreForm'
import type { Reservation } from '../types/reservation'
import Cloud from '../components/decor/Cloud'
import Leaf from '../components/decor/Leaf'
import GrassBorder from '../components/decor/GrassBorder'

const STATUS_LABEL: Record<Reservation['status'], string> = {
  pending: '保留中',
  confirmed: '予約確定',
  cancelled: 'キャンセル済み',
}

export default function ReservationsListPage() {
  const navigate = useNavigate()
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
    <div className="ac-page-bg">
      <header className="ac-header">
        <Cloud className="absolute right-6 top-2 h-8 w-16 opacity-30" />
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="ac-btn-secondary !px-4 !py-2 text-sm"
          >
            ← ダッシュボードに戻る
          </button>
          <h1 className="text-xl font-extrabold">予約一覧</h1>
        </div>
        <GrassBorder className="absolute -bottom-[5px] left-0 h-2 w-full" color="#eef9ff" />
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <p className="mb-4 text-sm font-bold text-bubble-700 bg-bubble-50 border-2 border-bubble-200 rounded-2xl px-4 py-2">
            {error}
          </p>
        )}

        {isLoading ? (
          <p className="text-wood-500 text-sm font-bold">読み込み中...</p>
        ) : reservations.length === 0 ? (
          <div className="ac-card relative text-center text-wood-500">
            <Leaf className="absolute -top-4 -left-4 h-9 w-9 -rotate-12 drop-shadow" />
            まだ予約がありません
          </div>
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
