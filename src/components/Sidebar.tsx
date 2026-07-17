import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface SidebarMenuItem {
  icon: string
  label: string
  to: string
  enabled: boolean
}

/**
 * 画面遷移用のサイドメニュー。
 * 権限が無い項目も非表示にはせず、活性/非活性（グレーアウト）で表現する。
 * デスクトップでは左固定の縦並び、モバイル幅では横スクロール可能な横並びになる。
 */
export default function Sidebar() {
  const { user, hasPermission, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const items: SidebarMenuItem[] = [
    { icon: '🏠', label: 'ダッシュボード', to: '/dashboard', enabled: true },
    { icon: '🤖', label: 'AIプラン提案', to: '/plan', enabled: true },
    { icon: '🏪', label: '店舗一覧・予約', to: '/stores', enabled: true },
    { icon: '📅', label: '予約一覧', to: '/reservations', enabled: true },
    { icon: '♥', label: 'いいね一覧', to: '/likes', enabled: true },
    { icon: '⚙️', label: '管理画面', to: '/admin', enabled: user?.role === 'admin' },
    { icon: '🚨', label: 'エラー管理', to: '/admin/errors', enabled: hasPermission('users', 'delete') },
  ]

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const commonItemClasses =
    'flex flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border-l-4 px-4 py-2.5 font-bold transition'

  // 現在地に最も一致するメニュー項目を1つだけactiveにする（完全一致 or パス階層一致のうち最長のto）。
  // 例: /admin/errors では「エラー管理」(/admin/errors) のみactiveにし、「管理画面」(/admin) は
  // 前方一致するがより短いtoなので除外する。
  const activeItem = items.reduce<SidebarMenuItem | null>((best, item) => {
    const matches = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
    if (!matches) return best
    if (!best || item.to.length > best.to.length) return item
    return best
  }, null)

  return (
    <aside className="w-full flex-shrink-0 p-4 md:sticky md:top-0 md:w-64 md:self-start">
      <nav className="ac-card flex flex-col gap-4 !p-4" aria-label="画面遷移メニュー">
        <ul className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
          {items.map((item) => {
            const isActive = item === activeItem

            if (!item.enabled) {
              return (
                <li key={item.to} className="flex-shrink-0">
                  <span
                    aria-disabled="true"
                    title="権限がありません"
                    className={`${commonItemClasses} pointer-events-none cursor-not-allowed select-none border-transparent text-wood-300 opacity-60`}
                  >
                    <span aria-hidden="true">{item.icon}</span>
                    {item.label}
                  </span>
                </li>
              )
            }

            return (
              <li key={item.to} className="flex-shrink-0">
                <Link
                  to={item.to}
                  className={`${commonItemClasses} ${
                    isActive
                      ? 'border-leaf-700 bg-leaf-500 text-white shadow-ac-sm'
                      : 'border-transparent text-wood-700 hover:bg-sand-200'
                  }`}
                >
                  <span aria-hidden="true">{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>

        <button onClick={handleLogout} className="ac-btn-danger w-full !py-2 text-sm">
          ログアウト
        </button>
      </nav>
    </aside>
  )
}
