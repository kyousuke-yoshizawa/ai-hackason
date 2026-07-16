import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/AppLayout'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import StoresPage from './pages/StoresPage'
import StoreDetailPage from './pages/StoreDetailPage'
import ReservationsListPage from './pages/ReservationsListPage'
import LikesListPage from './pages/LikesListPage'
import AdminPage from './pages/AdminPage'
import ErrorManagementDashboard from './pages/ErrorManagementDashboard'

function App() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />

        {/* 認証済み画面共通レイアウト（サイドメニュー常設）。
            base認証チェックはこの親routeのProtectedRouteが行い、Sidebar/AppLayoutは
            ページ遷移してもアンマウントされない。/admin, /admin/errors は個別に
            requireAdmin / requirePermission を上乗せするため、それぞれの子routeで
            ネストしたProtectedRouteを追加で適用する（基底の認証チェックと重複するが
            既存の挙動を完全に保つための意図的な二重ガード）。 */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/stores" element={<StoresPage />} />
          <Route path="/stores/:storeId" element={<StoreDetailPage />} />
          <Route path="/reservations" element={<ReservationsListPage />} />
          <Route path="/likes" element={<LikesListPage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin>
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/errors"
            element={
              <ProtectedRoute requirePermission={{ resource: 'users', action: 'delete' }}>
                <ErrorManagementDashboard />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
