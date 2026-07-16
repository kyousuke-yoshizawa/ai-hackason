import { render, screen } from '@testing-library/react'
import MapView from '../../src/components/MapView'
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
})
