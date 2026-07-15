import { render, screen, fireEvent } from '@testing-library/react'
import { UserManagementPanel } from '../../src/components/UserManagementPanel'
import { api } from '../../src/lib/api'

const mockGet = api.get as jest.Mock

const USERS = [
  { id: 'u1', email: 'charlie@example.com', name: 'Charlie', role: 'user' as const, store_id: null, is_active: true },
  { id: 'u2', email: 'alpha@example.com', name: 'Alpha', role: 'admin' as const, store_id: null, is_active: true },
  { id: 'u3', email: 'bravo@example.com', name: 'Bravo', role: 'store_manager' as const, store_id: null, is_active: false },
]

function setup() {
  mockGet.mockResolvedValue({ data: USERS })
  render(<UserManagementPanel onNotify={jest.fn()} />)
}

beforeEach(() => {
  mockGet.mockReset()
})

describe('UserManagementPanel 検索・絞り込み・ソート', () => {
  it('全件取得のためlimit=100を指定して取得する', async () => {
    setup()
    await screen.findByText('Charlie')

    expect(mockGet).toHaveBeenCalledWith('/api/users?limit=100')
  })

  it('名前またはメールで部分一致検索できる', async () => {
    setup()
    await screen.findByText('Charlie')

    fireEvent.change(screen.getByPlaceholderText('名前・メールで検索'), { target: { value: 'al' } })

    expect(screen.getByText('Alpha')).toBeTruthy()
    expect(screen.queryByText('Charlie')).toBeNull()
    expect(screen.queryByText('Bravo')).toBeNull()
  })

  it('ロールで絞り込みできる', async () => {
    setup()
    await screen.findByText('Charlie')

    fireEvent.change(screen.getByDisplayValue('すべてのロール'), { target: { value: 'admin' } })

    expect(screen.getByText('Alpha')).toBeTruthy()
    expect(screen.queryByText('Charlie')).toBeNull()
    expect(screen.queryByText('Bravo')).toBeNull()
  })

  it('有効/無効で絞り込みできる', async () => {
    setup()
    await screen.findByText('Charlie')

    fireEvent.change(screen.getByDisplayValue('すべての状態'), { target: { value: 'inactive' } })

    expect(screen.getByText('Bravo')).toBeTruthy()
    expect(screen.queryByText('Charlie')).toBeNull()
    expect(screen.queryByText('Alpha')).toBeNull()
  })

  it('ヘッダークリックで名前順の昇順・降順を切り替えられる', async () => {
    setup()
    await screen.findByText('Charlie')

    const bodyRowNames = () =>
      screen.getAllByRole('row').slice(1).map((row) => row.querySelectorAll('td')[1].textContent)

    expect(bodyRowNames()).toEqual(['Alpha', 'Bravo', 'Charlie'])

    fireEvent.click(screen.getByRole('button', { name: /名前/ }))
    expect(bodyRowNames()).toEqual(['Charlie', 'Bravo', 'Alpha'])
  })

  it('絞り込み結果が0件のとき専用メッセージを表示する', async () => {
    setup()
    await screen.findByText('Charlie')

    fireEvent.change(screen.getByPlaceholderText('名前・メールで検索'), { target: { value: '存在しないユーザー名' } })

    expect(await screen.findByText('検索条件に一致するユーザがいません')).toBeTruthy()
  })
})
