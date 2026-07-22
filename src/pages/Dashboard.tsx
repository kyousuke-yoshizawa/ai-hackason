import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getUserReservations } from '../lib/reservations'
import { getUserLikes } from '../lib/likes'
import Cloud from '../components/decor/Cloud'
import Leaf from '../components/decor/Leaf'
import GrassBorder from '../components/decor/GrassBorder'

export default function Dashboard() {
  const { user, hasPermission } = useAuth()
  const [reservationCount, setReservationCount] = useState<number | null>(null)
  const [likeCount, setLikeCount] = useState<number | null>(null)

  useEffect(() => {
    if (!user) return
    getUserReservations(user.id).then((res) => {
      if (res.success) setReservationCount(res.reservations.length)
    })
    getUserLikes(user.id).then((res) => {
      if (res.success) setLikeCount(res.likes.length)
    })
  }, [user])

  if (!user) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
        <p className="font-bold text-wood-600">ログインしてください</p>
      </div>
    )
  }

  return (
    <>
      {/* ヘッダー */}
      <header className="ac-header">
        <Cloud className="absolute right-6 top-2 h-8 w-16 opacity-30" />
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-4">
          <Leaf className="h-9 w-9" color="#dff1cf" />
          <div>
            <h1 className="text-xl font-extrabold">ことこと町</h1>
            <p className="text-xs font-bold text-leaf-100">お出かけプラン ダッシュボード</p>
          </div>
        </div>
        <GrassBorder className="absolute -bottom-[5px] left-0 h-2 w-full" color="#eef9ff" />
      </header>

      {/* メインコンテンツ */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* ウェルカムカード */}
          <div className="ac-card relative md:col-span-3 bg-leaf-500 border-leaf-700 text-white">
            <Leaf className="absolute -right-4 -top-6 h-20 w-20 rotate-12 opacity-20" color="#ffffff" />
            <h2 className="mb-2 text-2xl font-extrabold">ようこそ、{user.name}さん 🌿</h2>
            <p className="text-leaf-50">
              ことこと町のお出かけプランを一緒に見つけましょう。
              {user.role === 'admin' && ' 管理者権限でログインしています。'}
            </p>
          </div>

          {/* スタットカード */}
          <Link to="/plan" className="ac-card-sm block transition hover:shadow-ac">
            <h3 className="mb-2 text-sm font-bold text-wood-500">AIお出かけプラン</h3>
            <p className="mb-2 text-2xl font-extrabold text-leaf-600">🤖 提案してもらう</p>
            <p className="text-xs text-wood-400">今日のお出かけプランを相談</p>
          </Link>

          <Link to="/reservations" className="ac-card-sm block transition hover:shadow-ac">
            <h3 className="mb-2 text-sm font-bold text-wood-500">あなたの予約</h3>
            <p className="mb-2 text-3xl font-extrabold text-sky-600">{reservationCount ?? '–'}</p>
            <p className="text-xs text-wood-400">件</p>
          </Link>

          <Link to="/likes" className="ac-card-sm block transition hover:shadow-ac">
            <h3 className="mb-2 text-sm font-bold text-wood-500">いいねした店舗</h3>
            <p className="mb-2 text-3xl font-extrabold text-bubble-500">{likeCount ?? '–'}</p>
            <p className="text-xs text-wood-400">件</p>
          </Link>
        </div>

        {/* 管理者専用メニュー */}
        {hasPermission('users', 'delete') && (
          <div className="ac-card border-sand-400">
            <h3 className="mb-2 text-lg font-extrabold text-wood-800">管理者メニュー</h3>
            <p className="text-sm text-wood-500">
              このセクションは admin 権限を持つユーザにのみ表示されます。
            </p>
          </div>
        )}
      </main>

      {/* フッター */}
      <footer className="ac-footer mt-12 py-8">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <p className="text-sm text-wood-200">🍃 2026 ことこと町. All rights reserved.</p>
        </div>
      </footer>
    </>
  )
}
