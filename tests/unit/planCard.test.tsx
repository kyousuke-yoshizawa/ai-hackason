import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PlanCard from '../../src/components/PlanCard'
import type { PlanCandidate } from '../../src/types/plan'

// Issue #96: プラン生成画面のプランカードが立ち寄り先を時系列順に表示し、
// 移動メモ（travel_note）が読めることを検証する
describe('PlanCard', () => {
  it('立ち寄り先を開始時刻の昇順で表示し、travel_noteも表示する', () => {
    const candidate: PlanCandidate = {
      label: 'A案',
      score: 92,
      summary: 'ランチと映画とカフェを楽しむプラン',
      stops: [
        {
          store_id: 'store-2',
          store_name: 'シネマことこと',
          start_time: '13:00',
          end_time: '15:00',
          travel_note: 'のんびり食堂から徒歩5分',
          reason: '上映時間に合わせて選定',
        },
        {
          store_id: 'store-1',
          store_name: 'のんびり食堂',
          start_time: '11:00',
          end_time: '12:30',
          travel_note: '駅から徒歩3分',
          reason: 'ランチの人気店',
        },
        {
          store_id: 'store-3',
          store_name: 'カフェことこと',
          start_time: '15:15',
          end_time: '16:15',
          travel_note: 'シネマことことから徒歩2分',
          reason: '映画後にゆっくりできるカフェ',
        },
      ],
    }

    render(<PlanCard candidate={candidate} />)

    expect(screen.getByText('A案')).toBeTruthy()
    expect(screen.getByText('ランチと映画とカフェを楽しむプラン')).toBeTruthy()

    const storeNames = screen.getAllByTestId('plan-stop-name').map((el) => el.textContent)
    expect(storeNames).toEqual(['のんびり食堂', 'シネマことこと', 'カフェことこと'])

    expect(screen.getByText('駅から徒歩3分')).toBeTruthy()
    expect(screen.getByText('のんびり食堂から徒歩5分')).toBeTruthy()
    expect(screen.getByText('シネマことことから徒歩2分')).toBeTruthy()
  })

  it('立ち寄り先が0件のときは案内メッセージを表示する', () => {
    const candidate: PlanCandidate = {
      label: 'B案',
      score: 50,
      summary: '該当なし',
      stops: [],
    }

    render(<PlanCard candidate={candidate} />)

    expect(screen.getByText('立ち寄り先がありません')).toBeTruthy()
  })
})

// Issue #97: プラン応答の詳細情報（rating/open_time・close_time/crowd_note/offer_note）の表示
describe('PlanCard - 詳細情報の表示', () => {
  it('詳細情報がある場合は各チップを表示する', () => {
    const candidate: PlanCandidate = {
      label: 'A案',
      score: 92,
      summary: 'テスト',
      stops: [
        {
          store_id: 'store-1',
          store_name: 'のんびり食堂',
          start_time: '11:00',
          end_time: '12:30',
          travel_note: '駅から徒歩3分',
          reason: 'ランチの人気店',
          rating: 4.2,
          open_time: '11:00',
          close_time: '21:00',
          crowd_note: '現在やや混雑',
          offer_note: '今だけ10%オフ',
        },
      ],
    }

    render(<PlanCard candidate={candidate} />)

    expect(screen.getByText('★4.2')).toBeTruthy()
    expect(screen.getByText('営業 11:00–21:00')).toBeTruthy()
    expect(screen.getByText('現在やや混雑')).toBeTruthy()
    expect(screen.getByText('今だけ10%オフ')).toBeTruthy()
  })

  it('詳細情報がnull/未設定の場合はチップを表示しない', () => {
    const candidate: PlanCandidate = {
      label: 'A案',
      score: 92,
      summary: 'テスト',
      stops: [
        {
          store_id: 'store-1',
          store_name: 'のんびり食堂',
          start_time: '11:00',
          end_time: '12:30',
          travel_note: '駅から徒歩3分',
          reason: 'ランチの人気店',
          rating: null,
          open_time: null,
          close_time: null,
          crowd_note: null,
          offer_note: null,
        },
      ],
    }

    render(<PlanCard candidate={candidate} />)

    expect(screen.queryByTestId('plan-stop-chips')).toBeNull()
    expect(screen.queryByText(/^null$/)).toBeNull()
  })
})

// Issue #122: プランから予約への結線
describe('PlanCard - 予約ボタン', () => {
  const baseCandidate: PlanCandidate = {
    label: 'A案',
    score: 92,
    summary: 'テスト',
    stops: [
      {
        store_id: 'store-1',
        store_name: 'のんびり食堂',
        start_time: '11:00',
        end_time: '12:30',
        travel_note: '',
        reason: '',
      },
      {
        store_id: 'store-hallucinated',
        store_name: '存在しない店',
        start_time: '13:00',
        end_time: '14:00',
        travel_note: '',
        reason: '',
      },
    ],
  }

  it('storesに存在するstore_idのみ予約ボタンを表示する', () => {
    render(
      <PlanCard
        candidate={baseCandidate}
        stores={[{ id: 'store-1' }]}
        onReserve={() => {}}
      />
    )

    const buttons = screen.getAllByRole('button', { name: '予約する' })
    expect(buttons).toHaveLength(1)
  })

  it('onReserveが渡されていない場合は予約ボタンを表示しない', () => {
    render(<PlanCard candidate={baseCandidate} stores={[{ id: 'store-1' }, { id: 'store-hallucinated' }]} />)

    expect(screen.queryByRole('button', { name: '予約する' })).toBeNull()
  })

  it('予約ボタンを押すとonReserveがstart_time・partySize(指定値)付きで呼ばれる', async () => {
    const user = userEvent.setup()
    const onReserve = jest.fn()

    render(
      <PlanCard
        candidate={baseCandidate}
        stores={[{ id: 'store-1' }]}
        partySize={4}
        onReserve={onReserve}
      />
    )

    await user.click(screen.getByRole('button', { name: '予約する' }))

    expect(onReserve).toHaveBeenCalledWith({
      storeId: 'store-1',
      storeName: 'のんびり食堂',
      time: '11:00',
      partySize: 4,
    })
  })

  it('partySizeが未指定の場合はonReserveにデフォルトの2が渡される', async () => {
    const user = userEvent.setup()
    const onReserve = jest.fn()

    render(<PlanCard candidate={baseCandidate} stores={[{ id: 'store-1' }]} onReserve={onReserve} />)

    await user.click(screen.getByRole('button', { name: '予約する' }))

    expect(onReserve).toHaveBeenCalledWith(
      expect.objectContaining({ storeId: 'store-1', partySize: 2 })
    )
  })
})

// Issue #123: プラン合計予算の概算表示と予算超過警告
describe('PlanCard - 予算サマリー', () => {
  function candidateWithPrices(prices: { price_min?: number | null; price_max?: number | null }[]): PlanCandidate {
    return {
      label: 'A案',
      score: 92,
      summary: 'テスト',
      stops: prices.map((p, i) => ({
        store_id: `store-${i}`,
        store_name: `店舗${i}`,
        start_time: '11:00',
        end_time: '12:00',
        travel_note: '',
        reason: '',
        price_min: p.price_min,
        price_max: p.price_max,
      })),
    }
  }

  it('価格情報がある場合は概算予算と「予算内」バッジを表示する（合計最大<=budget）', () => {
    const candidate = candidateWithPrices([{ price_min: 1000, price_max: 1500 }])

    render(<PlanCard candidate={candidate} budget={1500} />)

    expect(screen.getByText('💰 概算 ¥1000〜¥1500 / 1人')).toBeTruthy()
    expect(screen.getByText('予算内')).toBeTruthy()
    expect(screen.queryByText('予算オーバーの可能性')).toBeNull()
  })

  it('合計最小がbudgetを超える場合は「予算オーバーの可能性」バッジを表示する', () => {
    const candidate = candidateWithPrices([{ price_min: 2000, price_max: 2500 }])

    render(<PlanCard candidate={candidate} budget={1500} />)

    expect(screen.getByText('予算オーバーの可能性')).toBeTruthy()
    expect(screen.queryByText('予算内')).toBeNull()
  })

  it('budget未設定の場合はどちらのバッジも表示しない', () => {
    const candidate = candidateWithPrices([{ price_min: 1000, price_max: 1500 }])

    render(<PlanCard candidate={candidate} />)

    expect(screen.queryByText('予算オーバーの可能性')).toBeNull()
    expect(screen.queryByText('予算内')).toBeNull()
  })

  it('一部店舗の価格が不明な場合は注記を表示する', () => {
    const candidate = candidateWithPrices([
      { price_min: 1000, price_max: 1500 },
      { price_min: null, price_max: null },
    ])

    render(<PlanCard candidate={candidate} budget={1500} />)

    expect(screen.getByText('※一部店舗の価格不明')).toBeTruthy()
  })

  it('全店舗の価格が不明な場合は概算予算行を表示しない（¥0〜¥0を出さない）', () => {
    const candidate = candidateWithPrices([{ price_min: null, price_max: null }])

    render(<PlanCard candidate={candidate} budget={1500} />)

    expect(screen.queryByTestId('plan-budget-summary')).toBeNull()
  })
})
