import { summarizePlanForHistory } from '../../src/lib/plan'
import type { PlanCandidate } from '../../src/types/plan'

// Issue #103フロント半分: 次回リクエストのhistoryに積む要約が、
// トークン節約のためJSONではなくlabel・店名・時刻程度の短い文字列になることを検証する
describe('summarizePlanForHistory', () => {
  it('候補ごとにlabelと立ち寄り先の時刻・店名を連結した文字列にする', () => {
    const candidates: PlanCandidate[] = [
      {
        label: 'A案',
        score: 92,
        summary: 'ランチとカフェ',
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
            store_id: 'store-2',
            store_name: 'カフェことこと',
            start_time: '15:15',
            end_time: '16:15',
            travel_note: '',
            reason: '',
          },
        ],
      },
      {
        label: 'B案',
        score: 80,
        summary: '別ルート',
        stops: [
          {
            store_id: 'store-3',
            store_name: 'シネマことこと',
            start_time: '13:00',
            end_time: '15:00',
            travel_note: '',
            reason: '',
          },
        ],
      },
    ]

    const summary = summarizePlanForHistory(candidates)

    expect(summary).toBe(
      'A案: 11:00-12:30 のんびり食堂、15:15-16:15 カフェことこと / B案: 13:00-15:00 シネマことこと'
    )
  })

  it('stopsが空でも例外を投げない', () => {
    const candidates: PlanCandidate[] = [{ label: 'A案', score: 0, summary: '', stops: [] }]

    expect(() => summarizePlanForHistory(candidates)).not.toThrow()
    expect(summarizePlanForHistory(candidates)).toBe('A案: 立ち寄り先なし')
  })

  it('候補が0件でも空文字列を返す', () => {
    expect(summarizePlanForHistory([])).toBe('')
  })
})
