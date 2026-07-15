import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import StoresPage from '../../src/pages/StoresPage'
import { AuthContext } from '../../src/context/AuthContext'
import { api } from '../../src/lib/api'

const mockGet = api.get as jest.Mock

const STORES = [
  { id: 's1', name: 'Charlie', category: 'Bakery', x: 0, y: 0, open_time: '10:00', close_time: '18:00', price_min: null, price_max: null },
  { id: 's2', name: 'Alpha', category: 'Sushi', x: 0, y: 0, open_time: '11:00', close_time: '22:00', price_min: null, price_max: null },
  { id: 's3', name: 'Bravo', category: 'Bakery', x: 0, y: 0, open_time: '08:00', close_time: '20:00', price_min: null, price_max: null },
]

function setup() {
  mockGet.mockImplementation((path: string) => {
    if (path === '/api/stores') return Promise.resolve({ data: STORES })
    if (path.includes('/likes/count')) return Promise.resolve({ count: 0 })
    return Promise.reject(new Error(`unexpected path: ${path}`))
  })

  const authValue = {
    user: null,
    permissions: [],
    isLoading: false,
    login: jest.fn(),
    logout: jest.fn(),
    isAuthenticated: false,
    hasPermission: () => false,
  }

  render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter>
        <StoresPage />
      </MemoryRouter>
    </AuthContext.Provider>
  )
}

beforeEach(() => {
  mockGet.mockReset()
})

describe('StoresPage 検索・絞り込み・ソート', () => {
  it('店舗名で部分一致検索できる', async () => {
    setup()
    await screen.findByText('Charlie')

    fireEvent.change(screen.getByPlaceholderText('店舗名で検索'), { target: { value: 'al' } })

    expect(screen.getByText('Alpha')).toBeTruthy()
    expect(screen.queryByText('Charlie')).toBeNull()
    expect(screen.queryByText('Bravo')).toBeNull()
  })

  it('カテゴリで絞り込みできる', async () => {
    setup()
    await screen.findByText('Charlie')

    fireEvent.change(screen.getByDisplayValue('すべてのカテゴリ'), { target: { value: 'Sushi' } })

    expect(screen.getByText('Alpha')).toBeTruthy()
    expect(screen.queryByText('Charlie')).toBeNull()
    expect(screen.queryByText('Bravo')).toBeNull()
  })

  it('カテゴリ順で並び替えると同カテゴリ内は店舗名順になる', async () => {
    setup()
    await screen.findByText('Charlie')

    fireEvent.change(screen.getByDisplayValue('店舗名順'), { target: { value: 'category' } })

    const names = Array.from(document.querySelectorAll('[data-testid="store-item"] p.font-medium')).map(
      (el) => el.textContent
    )
    expect(names).toEqual(['Bravo', 'Charlie', 'Alpha'])
  })

  it('絞り込み結果が0件のとき専用メッセージを表示する', async () => {
    setup()
    await screen.findByText('Charlie')

    fireEvent.change(screen.getByPlaceholderText('店舗名で検索'), { target: { value: '存在しない店舗名' } })

    expect(await screen.findByText('検索条件に一致する店舗がありません')).toBeTruthy()
  })
})
