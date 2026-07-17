import { planStopSchema, generatePlanResponseSchema, generatePlanRequestSchema } from '../../backend/domains/plan/schema'

const BASE_STOP = {
  store_id: 'store-1',
  store_name: 'のんびり亭',
  start_time: '11:00',
  end_time: '12:00',
  travel_note: '徒歩5分',
  reason: 'ランチにぴったり',
}

describe('planStopSchema', () => {
  it('評価・営業時間・混雑度・オファーの新フィールドを含むstopを検証できる（U005）', () => {
    const result = planStopSchema.safeParse({
      ...BASE_STOP,
      rating: 4.2,
      open_time: '11:00',
      close_time: '21:00',
      crowd_note: '12時台は混雑',
      offer_note: null,
    })

    expect(result.success).toBe(true)
  })

  it('新フィールドが無い旧形式のstopも引き続き検証できる（後方互換）', () => {
    const result = planStopSchema.safeParse(BASE_STOP)

    expect(result.success).toBe(true)
  })

  it('新フィールドがnullでも検証できる（評価未取得・オファー未実装のケース）', () => {
    const result = planStopSchema.safeParse({
      ...BASE_STOP,
      rating: null,
      open_time: null,
      close_time: null,
      crowd_note: null,
      offer_note: null,
    })

    expect(result.success).toBe(true)
  })

  it('ratingが0〜5の範囲外だと検証に失敗する', () => {
    const result = planStopSchema.safeParse({ ...BASE_STOP, rating: 5.5 })

    expect(result.success).toBe(false)
  })
})

describe('generatePlanRequestSchema', () => {
  it('history に交互のuser/assistantエントリを含むリクエストを検証できる（U006）', () => {
    const result = generatePlanRequestSchema.safeParse({
      message: 'A案のランチを別の店にして',
      history: [
        { role: 'user', content: 'ランチと映画のプランを作って' },
        { role: 'assistant', content: '{"candidates":[]}' },
      ],
    })

    expect(result.success).toBe(true)
  })

  it('history が無いリクエストも引き続き検証できる（後方互換）', () => {
    const result = generatePlanRequestSchema.safeParse({ message: 'ランチしたい' })

    expect(result.success).toBe(true)
  })

  it('history が11件以上だと検証に失敗する（max(10)）', () => {
    const history = Array.from({ length: 11 }, (_, i) => ({
      role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
      content: `発言${i}`,
    }))
    const result = generatePlanRequestSchema.safeParse({ message: 'ランチしたい', history })

    expect(result.success).toBe(false)
  })

  it('history のroleが不正な値（例: system）だと検証に失敗する', () => {
    const result = generatePlanRequestSchema.safeParse({
      message: 'ランチしたい',
      history: [{ role: 'system', content: '不正なロール' }],
    })

    expect(result.success).toBe(false)
  })

  it('history のcontentが上限（4000文字）を超えると検証に失敗する（無認証エンドポイントでのコスト増幅対策）', () => {
    const result = generatePlanRequestSchema.safeParse({
      message: 'ランチしたい',
      history: [{ role: 'user', content: 'a'.repeat(4001) }],
    })

    expect(result.success).toBe(false)
  })
})

describe('generatePlanResponseSchema', () => {
  it('新フィールドを含む候補一覧全体を検証できる', () => {
    const result = generatePlanResponseSchema.safeParse({
      intent: { desires: ['ランチ'], party_size: 2, budget: 3000, time_limit: '15:00' },
      candidates: [
        {
          label: '案A',
          stops: [
            {
              ...BASE_STOP,
              rating: 4.2,
              open_time: '11:00',
              close_time: '21:00',
              crowd_note: '12時台は混雑',
              offer_note: null,
            },
          ],
          score: 0.8,
          summary: 'ランチプラン',
        },
      ],
    })

    expect(result.success).toBe(true)
  })

  it('新フィールドを含まない旧形式のレスポンスも引き続き検証できる', () => {
    const result = generatePlanResponseSchema.safeParse({
      intent: { desires: ['ランチ'] },
      candidates: [
        {
          label: '案A',
          stops: [BASE_STOP],
          score: 0.8,
          summary: 'ランチプラン',
        },
      ],
    })

    expect(result.success).toBe(true)
  })
})
