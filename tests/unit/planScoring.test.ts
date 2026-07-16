import { getDistanceTag, scoreStore } from '../../backend/domains/plan/scoring'

describe('getDistanceTag', () => {
  it('150m以内は near', () => {
    expect(getDistanceTag(100, 0)).toBe('near')
    expect(getDistanceTag(150, 0)).toBe('near')
  })

  it('150〜400mは normal', () => {
    expect(getDistanceTag(151, 0)).toBe('normal')
    expect(getDistanceTag(400, 0)).toBe('normal')
  })

  it('400mを超えると far', () => {
    expect(getDistanceTag(401, 0)).toBe('far')
    expect(getDistanceTag(300, 300)).toBe('far')
  })
})

describe('scoreStore', () => {
  it('距離感near・評価5・混雑low・オファー有りで最高スコアになる', () => {
    const score = scoreStore({ distanceTag: 'near', rating: 5, crowdLevel: 'low', hasOffer: true })
    expect(score).toBeCloseTo(1.0, 5)
  })

  it('距離感far・評価0・混雑high・オファー無しで最低スコアになる', () => {
    const score = scoreStore({ distanceTag: 'far', rating: 0, crowdLevel: 'high', hasOffer: false })
    // 0.2*0.35 + 0*0.25 + 0.2*0.25 + 0 = 0.12
    expect(score).toBeCloseTo(0.12, 5)
  })

  it('レビュー無し・混雑不明の店舗は中間値扱いになる', () => {
    const score = scoreStore({ distanceTag: 'normal', rating: null, crowdLevel: null, hasOffer: false })
    // 0.6*0.35 + 0.5*0.25 + 0.6*0.25 = 0.21 + 0.125 + 0.15 = 0.485
    expect(score).toBeCloseTo(0.485, 5)
  })

  it('スコアは1.0を超えない', () => {
    const score = scoreStore({ distanceTag: 'near', rating: 5, crowdLevel: 'low', hasOffer: true })
    expect(score).toBeLessThanOrEqual(1.0)
  })

  it('オファー無しの満点店舗は0.85が理論上限になる（要件定義書v2 5章: 加重合計85%+オファー加点15%の別枠方式）', () => {
    const score = scoreStore({ distanceTag: 'near', rating: 5, crowdLevel: 'low', hasOffer: false })
    expect(score).toBeCloseTo(0.85, 5)
  })
})
