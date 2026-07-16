import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

/**
 * 認証済み画面共通のレイアウトシェル。
 * 背景(ac-page-bg) + サイドメニュー + 各画面のコンテンツ(Outlet)を組み合わせる。
 * react-router-dom のレイアウトルートとして使うため children ではなく Outlet を描画する。
 */
export default function AppLayout() {
  return (
    <div className="ac-page-bg flex flex-col md:flex-row">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  )
}
