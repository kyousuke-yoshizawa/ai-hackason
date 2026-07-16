import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { PageHeader } from '../components/ui/PageHeader'
import Cloud from '../components/decor/Cloud'
import Leaf from '../components/decor/Leaf'

export default function Dashboard() {
  const { user, logout, hasPermission } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  if (!user) {
    return (
      <div className="ac-page-bg flex items-center justify-center">
        <p className="font-bold text-wood-600">ログインしてください</p>
      </div>
    )
  }

  return (
    <div className="ac-page-bg">
      {/* ヘッダー */}
      <PageHeader
        title="ことこと町"
        subtitle="お出かけプラン ダッシュボード"
        icon={<Leaf className="h-9 w-9" color="#dff1cf" />}
        maxWidth="max-w-7xl"
        decor={<Cloud className="absolute right-6 top-2 h-8 w-16 opacity-30" />}
        rightSlot={
          <>
            <Link to="/likes" className="ac-btn-secondary !px-4 !py-2 text-sm">
              ♥ いいね一覧
            </Link>
            <Link to="/stores" className="ac-btn-secondary !px-4 !py-2 text-sm">
              店舗一覧・予約
            </Link>
            <Link to="/reservations" className="ac-btn-secondary !px-4 !py-2 text-sm">
              予約一覧
            </Link>
            {user.role === 'admin' && (
              <Link to="/admin" className="ac-btn-primary !px-4 !py-2 text-sm">
                管理画面
              </Link>
            )}
            {hasPermission('users', 'delete') && (
              <Link to="/admin/errors" className="ac-btn-primary !px-4 !py-2 text-sm">
                エラー管理
              </Link>
            )}
            <button onClick={handleLogout} className="ac-btn-danger !px-4 !py-2 text-sm">
              ログアウト
            </button>
          </>
        }
      />

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
          <div className="ac-card-sm">
            <h3 className="mb-2 text-sm font-bold text-wood-500">プロジェクト状態</h3>
            <p className="mb-2 text-3xl font-extrabold text-leaf-600">進行中</p>
            <p className="text-xs text-wood-400">開発フェーズ</p>
          </div>

          <div className="ac-card-sm">
            <h3 className="mb-2 text-sm font-bold text-wood-500">チームメンバー</h3>
            <p className="mb-2 text-3xl font-extrabold text-sky-600">4</p>
            <p className="text-xs text-wood-400">名</p>
          </div>

          <div className="ac-card-sm">
            <h3 className="mb-2 text-sm font-bold text-wood-500">ユーザ権限</h3>
            <p className="mb-2 text-lg font-extrabold capitalize text-wood-800">{user.role}</p>
            <p className="text-xs text-wood-400">
              {user.role === 'admin' ? '管理者' : '標準ユーザ'}
            </p>
          </div>
        </div>

        {/* 管理者専用メニュー */}
        {hasPermission('users', 'delete') && (
          <div className="ac-card mb-8 border-sand-400">
            <h3 className="mb-2 text-lg font-extrabold text-wood-800">管理者メニュー</h3>
            <p className="text-sm text-wood-500">
              このセクションは admin 権限を持つユーザにのみ表示されます。
            </p>
          </div>
        )}

        {/* アクティビティセクション */}
        <div className="ac-card">
          <h3 className="mb-4 text-lg font-extrabold text-wood-800">最近のアクティビティ</h3>
          <div className="space-y-3">
            <div className="flex gap-3 border-b border-sand-200 py-2 last:border-b-0">
              <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-leaf-500"></div>
              <div>
                <p className="text-sm font-bold text-wood-800">ログイン画面の実装が完了しました</p>
                <p className="text-xs text-wood-400">本日</p>
              </div>
            </div>
            <div className="flex gap-3 border-b border-sand-200 py-2 last:border-b-0">
              <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-leaf-500"></div>
              <div>
                <p className="text-sm font-bold text-wood-800">ダッシュボード画面がセットアップされました</p>
                <p className="text-xs text-wood-400">本日</p>
              </div>
            </div>
            <div className="flex gap-3 py-2">
              <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-sky-500"></div>
              <div>
                <p className="text-sm font-bold text-wood-800">プロジェクトが開始されました</p>
                <p className="text-xs text-wood-400">3日前</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* フッター */}
      <footer className="ac-footer mt-12 py-8">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <p className="text-sm text-wood-200">🍃 2026 ことこと町. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
