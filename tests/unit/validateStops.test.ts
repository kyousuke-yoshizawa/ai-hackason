import { reconcileStops } from '../../backend/domains/plan/validateStops'
import type { GeneratePlanResponse } from '../../backend/domains/plan/schema'

type PlanCandidate = GeneratePlanResponse['candidates'][number]

const STORES = [
  { id: 'store-1', name: 'のんびり亭' },
  { id: 'store-2', name: 'つきみ座' },
]

function buildStop(overrides: Partial<PlanCandidate['stops'][number]> = {}): PlanCandidate['stops'][number] {
  return {
    store_id: 'store-1',
    store_name: 'のんびり亭',
    start_time: '11:00',
    end_time: '12:00',
    travel_note: '徒歩5分',
    reason: 'ランチにぴったり',
    ...overrides,
  }
}

function buildCandidate(overrides: Partial<PlanCandidate> = {}): PlanCandidate {
  return {
    label: 'A案',
    stops: [buildStop()],
    score: 0.8,
    summary: 'ランチプラン',
    ...overrides,
  }
}

describe('reconcileStops（Issue #120: 幻覚store_id対策）', () => {
  it('実在するstore_id・store_nameのみの正常な応答は無変更で通る', () => {
    const candidates = [buildCandidate()]

    const { candidates: result, warnings } = reconcileStops(candidates, STORES)

    expect(result).toEqual(candidates)
    expect(warnings).toHaveLength(0)
  })

  it('store_idが捏造されていてもstore_nameが正しければIDが復元される', () => {
    const candidates = [
      buildCandidate({
        stops: [buildStop({ store_id: 'typo-id-999', store_name: 'のんびり亭' })],
      }),
    ]

    const { candidates: result, warnings } = reconcileStops(candidates, STORES)

    expect(result).toHaveLength(1)
    expect(result[0].stops[0].store_id).toBe('store-1')
    expect(result[0].stops[0].store_name).toBe('のんびり亭')
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('typo-id-999')
  })

  it('store_idは実在するがstore_nameが表記揺れの場合はマスタ名で上書きされる', () => {
    const candidates = [
      buildCandidate({
        stops: [buildStop({ store_id: 'store-1', store_name: 'のんびりてい' })],
      }),
    ]

    const { candidates: result, warnings } = reconcileStops(candidates, STORES)

    expect(result).toHaveLength(1)
    expect(result[0].stops[0].store_id).toBe('store-1')
    expect(result[0].stops[0].store_name).toBe('のんびり亭')
    expect(warnings).toHaveLength(1)
  })

  it('store_id・store_nameのいずれも解決不能なstopは除去され、stopsが空になったcandidateも除去される', () => {
    const candidates = [
      buildCandidate({
        label: 'A案',
        stops: [buildStop({ store_id: 'ghost-id', store_name: '存在しない店' })],
      }),
      buildCandidate({
        label: 'B案',
        stops: [buildStop({ store_id: 'store-2', store_name: 'つきみ座' })],
      }),
    ]

    const { candidates: result, warnings } = reconcileStops(candidates, STORES)

    // A案はstopsが空になるため候補ごと除去され、B案のみ残る
    expect(result).toHaveLength(1)
    expect(result[0].label).toBe('B案')
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('ghost-id')
  })

  it('全candidateのstopsが解決不能な場合、candidatesが空配列で返る（呼び出し側の502判定に使われる）', () => {
    const candidates = [
      buildCandidate({
        stops: [buildStop({ store_id: 'ghost-id', store_name: '存在しない店' })],
      }),
    ]

    const { candidates: result, warnings } = reconcileStops(candidates, STORES)

    expect(result).toEqual([])
    expect(warnings).toHaveLength(1)
  })
})
