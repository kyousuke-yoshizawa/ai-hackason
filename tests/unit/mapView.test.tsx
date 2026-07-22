import { render, screen, fireEvent } from '@testing-library/react'
import MapView, { type Landmark } from '../../src/components/MapView'
import type { PlanStop } from '../../src/types/plan'

// Issue #102: 選択中プラン候補の店舗・移動経路をSVGマップに可視化する。
// 店舗座標が見つからないstopがあっても落ちずにスキップされることを検証する
describe('MapView', () => {
  const stores = [
    { id: 'store-1', name: 'のんびり食堂', x: 40, y: 40 },
    { id: 'store-2', name: 'シネマことこと', x: 120, y: 80 },
    { id: 'store-3', name: 'カフェことこと', x: 200, y: 160 },
  ]

  const buildStop = (overrides: Partial<PlanStop>): PlanStop => ({
    store_id: 'store-1',
    store_name: 'のんびり食堂',
    start_time: '11:00',
    end_time: '12:30',
    travel_note: '',
    reason: '',
    ...overrides,
  })

  it('解決できた立ち寄り先の数だけマーカーと経路線を描画する', () => {
    const stops: PlanStop[] = [
      buildStop({ store_id: 'store-2', store_name: 'シネマことこと', start_time: '13:00', end_time: '15:00' }),
      buildStop({ store_id: 'store-1', store_name: 'のんびり食堂', start_time: '11:00', end_time: '12:30' }),
      buildStop({ store_id: 'store-3', store_name: 'カフェことこと', start_time: '15:15', end_time: '16:15' }),
    ]

    render(<MapView stops={stops} stores={stores} />)

    expect(screen.getAllByTestId('map-store-marker')).toHaveLength(3)
    expect(screen.getByTestId('map-route-line')).toBeTruthy()
  })

  it('店舗座標が見つからないstopはスキップし、落ちない', () => {
    const stops: PlanStop[] = [
      buildStop({ store_id: 'store-1', store_name: 'のんびり食堂' }),
      buildStop({ store_id: 'unknown-store', store_name: '謎の店', start_time: '13:00', end_time: '14:00' }),
    ]

    expect(() => render(<MapView stops={stops} stores={stores} />)).not.toThrow()

    expect(screen.getAllByTestId('map-store-marker')).toHaveLength(1)
  })

  it('立ち寄り先が0件でも落ちない', () => {
    expect(() => render(<MapView stops={[]} stores={stores} />)).not.toThrow()
    expect(screen.queryAllByTestId('map-store-marker')).toHaveLength(0)
    expect(screen.queryByTestId('map-route-line')).toBeNull()
  })

  // Issue #124: 店舗マーカーのホバー/クリックポップアップ
  describe('店舗マーカーのポップアップ', () => {
    const storesWithCategory = [
      { id: 'store-1', name: 'のんびり食堂', x: 40, y: 40, category: '食堂' },
      { id: 'store-2', name: 'シネマことこと', x: 320, y: 80, category: '映画館' },
    ]

    it('クリックでポップアップが表示され、再クリックで非表示になる（トグル）', () => {
      const stops: PlanStop[] = [
        buildStop({
          store_id: 'store-1',
          store_name: 'のんびり食堂',
          reason: 'ランチにおすすめのお店です',
          crowd_note: '空いています',
          offer_note: '10%オフクーポンあり',
        }),
      ]

      render(<MapView stops={stops} stores={storesWithCategory} />)

      expect(screen.queryByTestId('map-store-popup')).toBeNull()

      fireEvent.click(screen.getByTestId('map-store-marker-circle'))

      const popup = screen.getByTestId('map-store-popup')
      expect(popup).toBeTruthy()
      expect(popup.textContent).toContain('のんびり食堂')
      expect(popup.textContent).toContain('食堂')
      expect(popup.textContent).toContain('11:00')
      expect(popup.textContent).toContain('12:30')
      expect(popup.textContent).toContain('ランチにおすすめのお店です')
      expect(popup.textContent).toContain('空いています')
      expect(popup.textContent).toContain('10%オフクーポンあり')

      fireEvent.click(screen.getByTestId('map-store-marker-circle'))
      expect(screen.queryByTestId('map-store-popup')).toBeNull()
    })

    it('crowd_note/offer_noteが無い場合は該当行を表示しない', () => {
      const stops: PlanStop[] = [buildStop({ store_id: 'store-1', reason: '静かな店内です' })]

      render(<MapView stops={stops} stores={storesWithCategory} />)

      fireEvent.click(screen.getByTestId('map-store-marker-circle'))

      const popup = screen.getByTestId('map-store-popup')
      expect(popup.textContent).not.toContain('undefined')
      expect(popup.textContent).not.toContain('null')
    })

    it('マウスホバーでもポップアップが表示され、離れると隠れる', () => {
      const stops: PlanStop[] = [buildStop({ store_id: 'store-1' })]

      render(<MapView stops={stops} stores={storesWithCategory} />)

      const marker = screen.getByTestId('map-store-marker-circle')
      fireEvent.mouseEnter(marker)
      expect(screen.getByTestId('map-store-popup')).toBeTruthy()

      fireEvent.mouseLeave(marker)
      expect(screen.queryByTestId('map-store-popup')).toBeNull()
    })
  })

  // Issue #125: SVGマップの世界観装飾（MapDecorations）
  describe('MapDecorations（世界観装飾）との共存', () => {
    const landmarks: Landmark[] = [
      { name: 'どんぐり広場', x: 200, y: 200, kind: 'plaza' },
      { name: 'ぽかぽか駅', x: 200, y: 20, kind: 'station' },
      { name: 'しっぽ公園', x: 350, y: 320, kind: 'park' },
      { name: 'ぷかぷか商店街（西端）', x: 50, y: 230, kind: 'shopping_street' },
      { name: 'ぷかぷか商店街（東端）', x: 350, y: 230, kind: 'shopping_street' },
    ]

    it('landmarksを渡すと装飾要素がレンダリングされ、既存のマーカー/経路と共存する', () => {
      const stops: PlanStop[] = [
        buildStop({ store_id: 'store-2', store_name: 'シネマことこと', start_time: '13:00', end_time: '15:00' }),
        buildStop({ store_id: 'store-1', store_name: 'のんびり食堂', start_time: '11:00', end_time: '12:30' }),
      ]

      expect(() =>
        render(<MapView stops={stops} stores={stores} landmarks={landmarks} />)
      ).not.toThrow()

      expect(screen.getByTestId('map-decorations')).toBeTruthy()
      expect(screen.getByTestId('map-decor-shopping-street')).toBeTruthy()
      expect(screen.getByTestId('map-decor-station')).toBeTruthy()
      expect(screen.getByTestId('map-decor-plaza')).toBeTruthy()
      expect(screen.getByTestId('map-decor-park')).toBeTruthy()
      expect(screen.getAllByTestId('map-store-marker')).toHaveLength(2)
      expect(screen.getByTestId('map-route-line')).toBeTruthy()
      expect(screen.getAllByTestId('map-landmark')).toHaveLength(landmarks.length)
    })

    it('landmarksが空/未指定でも装飾レイヤーは落ちない', () => {
      expect(() => render(<MapView stops={[]} stores={stores} landmarks={[]} />)).not.toThrow()
      expect(screen.getByTestId('map-decorations')).toBeTruthy()
      expect(screen.queryByTestId('map-decor-station')).toBeNull()
    })
  })
})
