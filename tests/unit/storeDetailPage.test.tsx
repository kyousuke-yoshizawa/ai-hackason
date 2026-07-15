import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import StoreDetailPage from '../../src/pages/StoreDetailPage'
import { AuthContext } from '../../src/context/AuthContext'
import { api } from '../../src/lib/api'

// T13: いいね・レビュー機能の結線。LikeButton・StoreReviewSectionが
// 店舗詳細ページから実際に呼び出され、正しいデータで描画されることを検証する
const mockGet = api.get as jest.Mock

function mockGetByPath(routes: Record<string, unknown>) {
  mockGet.mockImplementation((path: string) => {
    for (const [suffix, value] of Object.entries(routes)) {
      if (path.endsWith(suffix)) return Promise.resolve(value)
    }
    return Promise.reject(new Error(`unexpected path: ${path}`))
  })
}

function renderDetailPage() {
  const authValue = {
    user: { id: 'user-1', email: 'a@example.com', name: 'テスト太郎', role: 'user' },
    permissions: [],
    isLoading: false,
    login: jest.fn(),
    logout: jest.fn(),
    isAuthenticated: true,
    hasPermission: () => false,
  }

  render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={['/stores/store-1']}>
        <Routes>
          <Route path="/stores/:storeId" element={<StoreDetailPage />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  )
}

beforeEach(() => {
  mockGet.mockReset()
})

describe('StoreDetailPage（T13: いいね・レビューの結線）', () => {
  it('店舗情報・いいね数・レビューを取得して表示する', async () => {
    mockGetByPath({
      '/api/stores/store-1': {
        id: 'store-1',
        name: 'のんびり亭',
        category: 'カフェ',
        x: 0,
        y: 0,
        open_time: '10:00',
        close_time: '20:00',
        price_min: null,
        price_max: null,
      },
      '/likes/count': { count: 3 },
      '/likes/mine': { liked: false, likeId: null },
      '/reviews/stats': { store_id: 'store-1', avg_rating: 4.5, review_count: 2, last_updated: '' },
      '/reviews': { data: [] },
    })

    renderDetailPage()

    expect(await screen.findByText('のんびり亭')).toBeTruthy()
    expect(await screen.findByText('3')).toBeTruthy()
    expect(await screen.findByText(/評価 4\.5 \/ 5/)).toBeTruthy()
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('/likes/mine')))
  })
})
