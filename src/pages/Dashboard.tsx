import { useAuth } from '../context/AuthContext'
import { PageHeader } from '../components/ui/PageHeader'
import Cloud from '../components/decor/Cloud'
import Leaf from '../components/decor/Leaf'

export default function Dashboard() {
  const { user, hasPermission } = useAuth()

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
      <PageHeader
        title="ことこと町"
        subtitle="お出かけプラン ダッシュボード"
        icon={<Leaf className="h-9 w-9" color="#dff1cf" />}
        maxWidth="max-w-7xl"
        decor={<Cloud className="absolute right-6 top-2 h-8 w-16 opacity-30" />}
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
