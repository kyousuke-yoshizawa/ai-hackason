import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { StoreManagementPanel } from '../../src/components/StoreManagementPanel'
import { api, ApiError } from '../../src/lib/api'

const mockGet = api.get as jest.Mock
const mockPost = api.post as jest.Mock

const STORES = [
  {
    id: 's1',
    name: 'Charlie',
    category: 'Bakery',
    x: 0,
    y: 0,
    open_time: '10:00',
    close_time: '18:00',
    price_min: null,
    price_max: null,
    crowd_level: 'low',
  },
  {
    id: 's2',
    name: 'Alpha',
    category: 'Sushi',
    x: 0,
    y: 0,
    open_time: '11:00',
    close_time: '22:00',
    price_min: null,
    price_max: null,
    crowd_level: 'medium',
  },
  {
    id: 's3',
    name: 'Bravo',
    category: 'Bakery',
    x: 0,
    y: 0,
    open_time: '08:00',
    close_time: '20:00',
    price_min: null,
    price_max: null,
    crowd_level: 'high',
  },
  {
    id: 's4',
    name: 'Delta',
    category: 'Cafe',
    x: 0,
    y: 0,
    open_time: '09:00',
    close_time: '17:00',
    price_min: null,
    price_max: null,
    crowd_level: null,
  },
]

function setup(onNotify: (message: string, type?: 'success' | 'error') => void = jest.fn()) {
  mockGet.mockResolvedValue({ data: STORES })
  render(<StoreManagementPanel onNotify={onNotify} />)
}

function storeRowByName(name: string): HTMLElement {
  const row = screen.getByText(name).closest('[data-testid="store-row"]')
  if (!row) throw new Error(`store row not found for name: ${name}`)
  return row as HTMLElement
}

beforeEach(() => {
  mockGet.mockReset()
  mockPost.mockReset()
})

describe('StoreManagementPanel 本日の混雑バッジ', () => {
  it('crowd_level の値ごとにラベルが表示される（low/medium/high/null）', async () => {
    setup()
    await screen.findByText('Charlie')

    expect(screen.getByText('空いている')).toBeTruthy()
    expect(screen.getByText('普通')).toBeTruthy()
    expect(screen.getByText('混雑')).toBeTruthy()
    expect(screen.getByText('未報告')).toBeTruthy()
  })

  it('low の店舗には緑系のバッジクラスが付与される', async () => {
    setup()
    await screen.findByText('Charlie')

    expect(screen.getByText('空いている').className).toContain('bg-leaf-100')
  })

  it('high の店舗には赤系のバッジクラスが付与される', async () => {
    setup()
    await screen.findByText('Charlie')

    expect(screen.getByText('混雑').className).toContain('bg-bubble-100')
  })

  it('crowd_level が null の店舗はグレーの未報告バッジになる', async () => {
    setup()
    await screen.findByText('Charlie')

    expect(screen.getByText('未報告').className).toContain('bg-gray-100')
  })
})

describe('StoreManagementPanel 混雑報告ボタン', () => {
  it('「空いてる」をクリックすると store_id と level=low で報告APIを呼び、一覧を再取得する', async () => {
    mockPost.mockResolvedValue({ storeId: 's1', level: 'low' })
    const onNotify = jest.fn()
    setup(onNotify)
    await screen.findByText('Charlie')

    mockGet.mockClear()
    const row = storeRowByName('Charlie')
    fireEvent.click(within(row).getByText('空いてる'))

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/api/crowd/report', { store_id: 's1', level: 'low' })
    })
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalled()
    })
    expect(onNotify).toHaveBeenCalledWith(expect.stringContaining('空いている'))
  })

  it('「混んでる」をクリックすると store_id と level=high で報告APIを呼ぶ', async () => {
    mockPost.mockResolvedValue({ storeId: 's2', level: 'high' })
    const onNotify = jest.fn()
    setup(onNotify)
    await screen.findByText('Alpha')

    const row = storeRowByName('Alpha')
    fireEvent.click(within(row).getByText('混んでる'))

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/api/crowd/report', { store_id: 's2', level: 'high' })
    })
  })

  it('報告APIが失敗した場合はエラー通知を表示し、一覧はクラッシュしない', async () => {
    mockPost.mockRejectedValue(new ApiError('権限がありません', 403))
    const onNotify = jest.fn()
    setup(onNotify)
    await screen.findByText('Charlie')

    const row = storeRowByName('Charlie')
    fireEvent.click(within(row).getByText('空いてる'))

    await waitFor(() => {
      expect(onNotify).toHaveBeenCalledWith('権限がありません', 'error')
    })
    // 一覧は依然として表示されている（クラッシュしていない）
    expect(screen.getByText('Charlie')).toBeTruthy()
  })
})
