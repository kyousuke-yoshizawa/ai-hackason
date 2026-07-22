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
  it('検索ボタンを押すまでは一覧が変化しない', async () => {
    setup()
    await screen.findByText('Charlie')

    fireEvent.change(screen.getByPlaceholderText('店舗名で検索'), { target: { value: 'al' } })

    expect(screen.getByText('Charlie')).toBeTruthy()
    expect(screen.getByText('Alpha')).toBeTruthy()
    expect(screen.getByText('Bravo')).toBeTruthy()
  })

  it('検索ボタンを押すと店舗名の部分一致で絞り込まれる', async () => {
    setup()
    await screen.findByText('Charlie')

    fireEvent.change(screen.getByPlaceholderText('店舗名で検索'), { target: { value: 'al' } })
    fireEvent.click(screen.getByRole('button', { name: '検索' }))

    expect(screen.getByText('Alpha')).toBeTruthy()
    expect(screen.queryByText('Charlie')).toBeNull()
    expect(screen.queryByText('Bravo')).toBeNull()
  })

  it('検索ボタンを押すとカテゴリで絞り込まれる', async () => {
    setup()
    await screen.findByText('Charlie')

    fireEvent.change(screen.getByDisplayValue('すべてのカテゴリ'), { target: { value: 'Sushi' } })
    fireEvent.click(screen.getByRole('button', { name: '検索' }))

    expect(screen.getByText('Alpha')).toBeTruthy()
    expect(screen.queryByText('Charlie')).toBeNull()
    expect(screen.queryByText('Bravo')).toBeNull()
  })

  it('クリアボタンで検索条件と一覧表示が初期状態に戻る', async () => {
    setup()
    await screen.findByText('Charlie')

    fireEvent.change(screen.getByPlaceholderText('店舗名で検索'), { target: { value: 'al' } })
    fireEvent.click(screen.getByRole('button', { name: '検索' }))
    expect(screen.queryByText('Charlie')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'クリア' }))

    expect(screen.getByPlaceholderText('店舗名で検索')).toHaveValue('')
    expect(screen.getByDisplayValue('すべてのカテゴリ')).toBeTruthy()
    expect(screen.getByText('Charlie')).toBeTruthy()
    expect(screen.getByText('Alpha')).toBeTruthy()
    expect(screen.getByText('Bravo')).toBeTruthy()
  })

  it('カテゴリ順で並び替えると同カテゴリ内は店舗名順になる', async () => {
    setup()
    await screen.findByText('Charlie')

    fireEvent.change(screen.getByDisplayValue('店舗名順'), { target: { value: 'category' } })

    const names = Array.from(document.querySelectorAll('[data-testid="store-item"] p.font-bold')).map(
      (el) => el.textContent
    )
    expect(names).toEqual(['Bravo', 'Charlie', 'Alpha'])
  })

  it('絞り込み結果が0件のとき専用メッセージを表示する', async () => {
    setup()
    await screen.findByText('Charlie')

    fireEvent.change(screen.getByPlaceholderText('店舗名で検索'), { target: { value: '存在しない店舗名' } })
    fireEvent.click(screen.getByRole('button', { name: '検索' }))

    expect(await screen.findByText('検索条件に一致する店舗がありません')).toBeTruthy()
  })
})

describe('StoresPage 店舗サムネイル表示', () => {
  it('thumbnail_urlがある店舗は画像を表示する', async () => {
    mockGet.mockImplementation((path: string) => {
      if (path === '/api/stores') {
        return Promise.resolve({
          data: [
            { ...STORES[0], thumbnail_url: 'https://example.com/photo.jpg' },
            { ...STORES[1], thumbnail_url: null },
          ],
        })
      }
      if (path.includes('/likes/count')) return Promise.resolve({ count: 0 })
      return Promise.reject(new Error(`unexpected path: ${path}`))
    })

    render(
      <AuthContext.Provider
        value={{
          user: null,
          permissions: [],
          isLoading: false,
          login: jest.fn(),
          logout: jest.fn(),
          isAuthenticated: false,
          hasPermission: () => false,
        }}
      >
        <MemoryRouter>
          <StoresPage />
        </MemoryRouter>
      </AuthContext.Provider>
    )

    const img = await screen.findByAltText('Charlie')
    expect(img).toHaveAttribute('src', 'https://example.com/photo.jpg')
  })

  it('thumbnail_urlが無い店舗はカテゴリ絵文字のプレースホルダーを表示する', async () => {
    setup()
    await screen.findByText('Charlie')

    // STORES にはいずれも thumbnail_url が無いため、絵文字プレースホルダー(role="img")が表示される
    const placeholders = screen.getAllByRole('img', { name: /のイメージ/ })
    expect(placeholders.length).toBe(STORES.length)
  })

  it('画像の読み込みに失敗した場合はプレースホルダーにフォールバックする', async () => {
    mockGet.mockImplementation((path: string) => {
      if (path === '/api/stores') {
        return Promise.resolve({
          data: [{ ...STORES[0], thumbnail_url: 'https://example.com/broken.jpg' }],
        })
      }
      if (path.includes('/likes/count')) return Promise.resolve({ count: 0 })
      return Promise.reject(new Error(`unexpected path: ${path}`))
    })

    render(
      <AuthContext.Provider
        value={{
          user: null,
          permissions: [],
          isLoading: false,
          login: jest.fn(),
          logout: jest.fn(),
          isAuthenticated: false,
          hasPermission: () => false,
        }}
      >
        <MemoryRouter>
          <StoresPage />
        </MemoryRouter>
      </AuthContext.Provider>
    )

    const img = await screen.findByAltText('Charlie')
    fireEvent.error(img)

    expect(await screen.findByRole('img', { name: 'Charlieのイメージ' })).toBeTruthy()
    expect(screen.queryByAltText('Charlie')).toBeNull()
  })
})
