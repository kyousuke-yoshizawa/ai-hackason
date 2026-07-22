import { render, screen } from '@testing-library/react'
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
