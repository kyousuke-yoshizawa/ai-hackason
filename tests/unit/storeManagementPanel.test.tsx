import { render, screen, fireEvent } from '@testing-library/react'
import { StoreManagementPanel } from '../../src/components/StoreManagementPanel'
import { api } from '../../src/lib/api'

const mockGet = api.get as jest.Mock

const STORES = [
  { id: 's1', name: 'Charlie', category: 'Bakery', x: 0, y: 0, open_time: '10:00', close_time: '18:00', price_min: null, price_max: null },
  { id: 's2', name: 'Alpha', category: 'Sushi', x: 0, y: 0, open_time: '11:00', close_time: '22:00', price_min: null, price_max: null },
  { id: 's3', name: 'Bravo', category: 'Bakery', x: 0, y: 0, open_time: '08:00', close_time: '20:00', price_min: null, price_max: null },
]

function setup() {
  mockGet.mockResolvedValue({ data: STORES })
  render(<StoreManagementPanel onNotify={jest.fn()} />)
}

beforeEach(() => {
  mockGet.mockReset()
})

describe('StoreManagementPanel 検索・絞り込み・ソート', () => {
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

  it('ヘッダークリックで名前順の昇順・降順を切り替えられる', async () => {
    setup()
    await screen.findByText('Charlie')

    const bodyRowNames = () =>
      screen
        .getAllByTestId('store-row')
        .map((row) => row.querySelector('p.font-bold')?.textContent)

    expect(bodyRowNames()).toEqual(['Alpha', 'Bravo', 'Charlie'])

    fireEvent.click(screen.getByRole('button', { name: /名前/ }))
    expect(bodyRowNames()).toEqual(['Charlie', 'Bravo', 'Alpha'])

    fireEvent.click(screen.getByRole('button', { name: /名前/ }))
    expect(bodyRowNames()).toEqual(['Alpha', 'Bravo', 'Charlie'])
  })

  it('絞り込み結果が0件のとき専用メッセージを表示する', async () => {
    setup()
    await screen.findByText('Charlie')

    fireEvent.change(screen.getByPlaceholderText('店舗名で検索'), { target: { value: '存在しない店舗名' } })

    expect(await screen.findByText('検索条件に一致する店舗がありません')).toBeTruthy()
  })

  it('カテゴリ順ソート時、同カテゴリ内は名前順（タイブレーク）になる', async () => {
    setup()
    await screen.findByText('Charlie')

    const bodyRowNames = () =>
      screen
        .getAllByTestId('store-row')
        .map((row) => row.querySelector('p.font-bold')?.textContent)

    fireEvent.click(screen.getByRole('button', { name: /カテゴリ/ }))

    expect(bodyRowNames()).toEqual(['Bravo', 'Charlie', 'Alpha'])
  })
})
