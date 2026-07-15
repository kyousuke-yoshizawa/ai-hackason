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
    fireEvent.click(screen.getByRole('button', { name: '検索' }))

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
