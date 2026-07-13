import { useAuth } from '../context/AuthContext'
import { useNavigate } from '../hooks/useNavigate'

export default function Dashboard() {
  const { user, logout, hasPermission } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">ログインしてください</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Hackathon 2026</h1>
            <p className="text-sm text-gray-600">ダッシュボード</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-600">{user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* ウェルカムカード */}
          <div className="md:col-span-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg p-6 text-white">
            <h2 className="text-2xl font-bold mb-2">ようこそ、{user.name}さん</h2>
            <p className="text-indigo-100">
              AI Hackathon 2026 プロジェクトのダッシュボードへようこそ。
              {user.role === 'admin' && '管理者権限でログインしています。'}
            </p>
          </div>

          {/* スタットカード */}
          <div className="bg-white rounded-lg p-6 shadow">
            <h3 className="text-gray-600 text-sm font-medium mb-2">プロジェクト状態</h3>
            <p className="text-3xl font-bold text-indigo-600 mb-2">進行中</p>
            <p className="text-xs text-gray-500">開発フェーズ</p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow">
            <h3 className="text-gray-600 text-sm font-medium mb-2">チームメンバー</h3>
            <p className="text-3xl font-bold text-blue-600 mb-2">4</p>
            <p className="text-xs text-gray-500">名</p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow">
            <h3 className="text-gray-600 text-sm font-medium mb-2">ユーザ権限</h3>
            <p className="text-lg font-bold text-gray-900 mb-2 capitalize">{user.role}</p>
            <p className="text-xs text-gray-500">
              {user.role === 'admin' ? '管理者' : '標準ユーザ'}
            </p>
          </div>
        </div>

        {/* 管理者専用メニュー（Issue #22: role に応じたコンディショナルレンダリング） */}
        {hasPermission('users', 'delete') && (
          <div className="bg-white rounded-lg p-6 shadow mb-8 border-2 border-indigo-200">
            <h3 className="text-lg font-bold text-gray-900 mb-2">管理者メニュー</h3>
            <p className="text-sm text-gray-600">
              このセクションは admin 権限を持つユーザにのみ表示されます。
            </p>
          </div>
        )}

        {/* アクティビティセクション */}
        <div className="bg-white rounded-lg p-6 shadow">
          <h3 className="text-lg font-bold text-gray-900 mb-4">最近のアクティビティ</h3>
          <div className="space-y-3">
            <div className="flex gap-3 py-2 border-b border-gray-200 last:border-b-0">
              <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">ログイン画面の実装が完了しました</p>
                <p className="text-xs text-gray-500">本日</p>
              </div>
            </div>
            <div className="flex gap-3 py-2 border-b border-gray-200 last:border-b-0">
              <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">ダッシュボード画面がセットアップされました</p>
                <p className="text-xs text-gray-500">本日</p>
              </div>
            </div>
            <div className="flex gap-3 py-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">プロジェクトが開始されました</p>
                <p className="text-xs text-gray-500">3日前</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* フッター */}
      <footer className="mt-12 bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-400">© 2026 AI Hackathon. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
