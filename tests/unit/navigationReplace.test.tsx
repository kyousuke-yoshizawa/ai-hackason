import { render, fireEvent, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LoginPage from '../../src/pages/LoginPage'
import Dashboard from '../../src/pages/Dashboard'
import { AuthContext } from '../../src/context/AuthContext'

// レビュー指摘（T10）: ログイン/ログアウト時のnavigate()がhistoryを積み、
// ブラウザバックで/login⇄/dashboardの往復が発生していた問題の回帰テスト
const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

beforeEach(() => {
  mockNavigate.mockClear()
})

describe('ログイン/ログアウト時のnavigateはreplace:trueでhistoryを汚さない（T10レビュー対応）', () => {
  it('ログイン成功時、/dashboardへreplaceで遷移する', async () => {
    const authValue = {
      user: null,
      permissions: [],
      isLoading: false,
      login: jest.fn().mockResolvedValue({ success: true }),
      logout: jest.fn(),
      isAuthenticated: false,
      hasPermission: () => false,
    }

    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </AuthContext.Provider>
    )

    fireEvent.change(screen.getByLabelText('メールアドレス'), { target: { value: 'a@example.com' } })
    fireEvent.change(screen.getByLabelText('パスワード'), { target: { value: 'password' } })
    fireEvent.click(screen.getByRole('button', { name: 'ログイン' }))

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true }))
  })

  it('ログアウト時、/loginへreplaceで遷移する', async () => {
    const authValue = {
      user: { id: 'user-1', email: 'a@example.com', name: 'テスト', role: 'user' },
      permissions: [],
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn().mockResolvedValue(undefined),
      isAuthenticated: true,
      hasPermission: () => false,
    }

    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      </AuthContext.Provider>
    )

    fireEvent.click(screen.getByRole('button', { name: 'ログアウト' }))

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true }))
  })
})
