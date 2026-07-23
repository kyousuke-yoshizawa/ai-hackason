import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CrowdPatternGrid } from '../../src/components/CrowdPatternGrid'
import { api } from '../../src/lib/api'
import type { CrowdPatternEntry } from '../../src/lib/crowdPatterns'

const mockGet = api.get as jest.Mock
const mockPut = api.put as jest.Mock

beforeEach(() => {
  mockGet.mockReset()
  mockPut.mockReset()
})

// Issue #99: 混雑パターン設定グリッドUI＋曜日次元の追加
describe('CrowdPatternGrid 初期表示', () => {
  it('取得したパターン（曜日別 + 全曜日共通のnull行）をグリッドに反映する', async () => {
    const patterns: CrowdPatternEntry[] = [
      { day_of_week: 3, hour_of_day: 12, level: 'high' },
      { day_of_week: null, hour_of_day: 9, level: 'low' },
    ]
    mockGet.mockResolvedValue(patterns)

    render(<CrowdPatternGrid storeId="store-1" />)

    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/api/crowd/patterns/store-1'))

    // 水曜(day_of_week=3) 12時 のセルは「混」表示・混雑色になる
    const highCell = await screen.findByRole('button', { name: '水 12時 混雑' })
    expect(highCell.className).toContain('bg-bubble-100')
    expect(highCell.textContent).toBe('混')

    // 全曜日共通(day_of_week=null) 9時 のセルは「空」表示になる
    const lowCell = screen.getByRole('button', { name: '全曜日共通 9時 空いている' })
    expect(lowCell.className).toContain('bg-leaf-100')
    expect(lowCell.textContent).toBe('空')

    // 未設定セルは空欄・グレー表示
    const unsetCell = screen.getByRole('button', { name: '水 13時 未設定' })
    expect(unsetCell.className).toContain('bg-gray-100')
    expect(unsetCell.textContent).toBe('')
  })

  it('取得に失敗した場合はエラーメッセージを表示する', async () => {
    mockGet.mockRejectedValue(new Error('network error'))

    render(<CrowdPatternGrid storeId="store-1" />)

    expect(await screen.findByText('混雑パターンの取得に失敗しました')).toBeTruthy()
  })
})

describe('CrowdPatternGrid セルクリックのサイクル', () => {
  it('未設定 → low → medium → high → 未設定 の順にサイクルする', async () => {
    mockGet.mockResolvedValue([])
    render(<CrowdPatternGrid storeId="store-1" />)

    const cell = await screen.findByRole('button', { name: '月 10時 未設定' })
    expect(cell.textContent).toBe('')

    fireEvent.click(cell)
    expect(await screen.findByRole('button', { name: '月 10時 空いている' })).toHaveTextContent('空')

    fireEvent.click(screen.getByRole('button', { name: '月 10時 空いている' }))
    expect(await screen.findByRole('button', { name: '月 10時 普通' })).toHaveTextContent('普')

    fireEvent.click(screen.getByRole('button', { name: '月 10時 普通' }))
    expect(await screen.findByRole('button', { name: '月 10時 混雑' })).toHaveTextContent('混')

    fireEvent.click(screen.getByRole('button', { name: '月 10時 混雑' }))
    expect(await screen.findByRole('button', { name: '月 10時 未設定' })).toHaveTextContent('')
  })
})

describe('CrowdPatternGrid 保存', () => {
  it('設定済みのセルのみをペイロードとして保存APIを呼ぶ（全曜日共通行はday_of_week:nullに変換）', async () => {
    mockGet.mockResolvedValue([])
    mockPut.mockResolvedValue({ storeId: 'store-1', count: 2 })
    const onSaved = jest.fn()

    render(<CrowdPatternGrid storeId="store-1" onSaved={onSaved} />)

    // 月曜 10時 を1回クリック -> low
    const dayCell = await screen.findByRole('button', { name: '月 10時 未設定' })
    fireEvent.click(dayCell)

    // 全曜日共通 9時 を2回クリック -> medium
    const fallbackCell = await screen.findByRole('button', { name: '全曜日共通 9時 未設定' })
    fireEvent.click(fallbackCell)
    fireEvent.click(screen.getByRole('button', { name: '全曜日共通 9時 空いている' }))

    fireEvent.click(screen.getByRole('button', { name: '保存する' }))

    await waitFor(() => expect(mockPut).toHaveBeenCalled())

    const [path, body] = mockPut.mock.calls[0]
    expect(path).toBe('/api/crowd/patterns/store-1')
    expect(body).toEqual(
      expect.arrayContaining([
        { day_of_week: 1, hour_of_day: 10, level: 'low' },
        { day_of_week: null, hour_of_day: 9, level: 'medium' },
      ])
    )
    // 未設定セル（192マス中の残り190マス）は含まれない
    expect(body).toHaveLength(2)

    await waitFor(() => expect(onSaved).toHaveBeenCalled())
  })

  it('保存に失敗した場合はonErrorを呼ぶ', async () => {
    mockGet.mockResolvedValue([])
    mockPut.mockRejectedValue(new Error('boom'))
    const onError = jest.fn()

    render(<CrowdPatternGrid storeId="store-1" onError={onError} />)
    await screen.findByRole('button', { name: '保存する' })

    fireEvent.click(screen.getByRole('button', { name: '保存する' }))

    await waitFor(() => expect(onError).toHaveBeenCalledWith('混雑パターンの保存に失敗しました'))
  })
})
