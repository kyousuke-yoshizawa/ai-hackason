import { formatPlanAsText } from '../../src/lib/planText'
import type { PlanCandidate } from '../../src/types/plan'

describe('formatPlanAsText', () => {
  it('見出し・立ち寄り先・移動メモ・サマリーを含む整形テキストを生成する', () => {
    const candidate: PlanCandidate = {
      label: 'A案',
      score: 0.8,
      summary: 'のんびりランチとカフェのプランです',
      stops: [
        {
          store_id: 'store-1',
          store_name: 'のんびり亭',
          start_time: '12:00',
          end_time: '13:00',
          travel_note: '',
          reason: 'ふんわり卵の定食が人気',
        },
        {
          store_id: 'store-2',
          store_name: 'ことりカフェ',
          start_time: '14:00',
          end_time: '15:00',
          travel_note: '徒歩5分ほど',
          reason: '',
        },
      ],
    }

    const text = formatPlanAsText(candidate)

    expect(text).toContain('🌿 ことこと町おでかけプラン（A案）')
    expect(text).toContain('① 12:00-13:00 のんびり亭')
    expect(text).toContain('ふんわり卵の定食が人気')
    expect(text).toContain('↓ 徒歩5分ほど')
    expect(text).toContain('② 14:00-15:00 ことりカフェ')
    expect(text).toContain('のんびりランチとカフェのプランです')
  })

  it('stopsが0件でも見出しとサマリーだけで壊れない', () => {
    const candidate: PlanCandidate = { label: 'B案', score: 0.5, summary: '該当なし', stops: [] }

    const text = formatPlanAsText(candidate)

    expect(text).toContain('🌿 ことこと町おでかけプラン（B案）')
    expect(text).toContain('該当なし')
  })
})
