import { render, screen } from '@testing-library/react'
import App from '../../src/App'
import { useAuth } from '../../src/context/AuthContext'

// T10: ページ本体の副作用（api呼び出し等）を避け、App.tsxのルーティング/
// ProtectedRouteのリダイレクト判定だけを検証する
jest.mock('../../src/context/AuthContext', () => ({ useAuth: jest.fn() }))
jest.mock('../../src/pages/LoginPage', () => ({ __esModule: true, default: () => <div>LoginPageStub</div> }))
jest.mock('../../src/pages/Dashboard', () => ({ __esModule: true, default: () => <div>DashboardStub</div> }))
jest.mock('../../src/pages/StoresPage', () => ({ __esModule: true, default: () => <div>StoresPageStub</div> }))
jest.mock('../../src/pages/StoreDetailPage', () => ({
  __esModule: true,
  default: () => <div>StoreDetailPageStub</div>,
}))
jest.mock('../../src/pages/ReservationsListPage', () => ({
  __esModule: true,
  default: () => <div>ReservationsListPageStub</div>,
}))
jest.mock('../../src/pages/LikesListPage', () => ({ __esModule: true, default: () => <div>LikesListPageStub</div> }))
jest.mock('../../src/pages/AdminPage', () => ({ __esModule: true, default: () => <div>AdminPageStub</div> }))
jest.mock('../../src/pages/ErrorManagementDashboard', () => ({
  __esModule: true,
  default: () => <div>ErrorManagementDashboardStub</div>,
}))

const mockUseAuth = useAuth as jest.Mock

function renderAt(path: string) {
  window.history.pushState({}, '', path)
  render(<App />)
}

describe('App routing (T10)', () => {
  it('未認証で /dashboard を直接開くと /login にリダイレクトされる', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: false, user: null, hasPermission: () => false })
    renderAt('/dashboard')

    expect(screen.getByText('LoginPageStub')).toBeTruthy()
  })

  it('認証済みで / を開くと /dashboard へ遷移する', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { role: 'user' },
      hasPermission: () => false,
    })
    renderAt('/')

    expect(screen.getByText('DashboardStub')).toBeTruthy()
  })

  it('リロード相当（URL直アクセス）でも /stores がそのまま開く', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { role: 'user' },
      hasPermission: () => false,
    })
    renderAt('/stores')

    expect(screen.getByText('StoresPageStub')).toBeTruthy()
  })

  it('/stores/:storeId で店舗詳細ページが開く（T13: いいね・レビューの結線先）', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { role: 'user' },
      hasPermission: () => false,
    })
    renderAt('/stores/store-1')

    expect(screen.getByText('StoreDetailPageStub')).toBeTruthy()
  })

  it('admin以外が /admin を開くと /dashboard へリダイレクトされる', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { role: 'user' },
      hasPermission: () => false,
    })
    renderAt('/admin')

    expect(screen.getByText('DashboardStub')).toBeTruthy()
  })

  it('admin が /admin を開くと AdminPage が表示される', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { role: 'admin' },
      hasPermission: () => false,
    })
    renderAt('/admin')

    expect(screen.getByText('AdminPageStub')).toBeTruthy()
  })

  it('users:delete 権限を持たないユーザが /admin/errors を開くと /dashboard へリダイレクトされる', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { role: 'user' },
      hasPermission: () => false,
    })
    renderAt('/admin/errors')

    expect(screen.getByText('DashboardStub')).toBeTruthy()
  })

  it('users:delete 権限を持つユーザが /admin/errors を開くと ErrorManagementDashboard が表示される', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { role: 'user' },
      hasPermission: (resource: string, action: string) => resource === 'users' && action === 'delete',
    })
    renderAt('/admin/errors')

    expect(screen.getByText('ErrorManagementDashboardStub')).toBeTruthy()
  })

  it('存在しないパスは認証状態に応じて / 相当へフォールバックする', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { role: 'user' },
      hasPermission: () => false,
    })
    renderAt('/no-such-page')

    expect(screen.getByText('DashboardStub')).toBeTruthy()
  })
})
