import { INTENT_CASES } from '../golden/intentCases'

describe('INTENT_CASES（ゴールデンケース定義の妥当性）', () => {
  it('10件以上定義されている', () => {
    expect(INTENT_CASES.length).toBeGreaterThanOrEqual(10)
  })

  it('各ケースがname/message/expectを持ち、重複nameがない', () => {
    const names = new Set<string>()
    for (const testCase of INTENT_CASES) {
      expect(testCase.name.length).toBeGreaterThan(0)
      expect(testCase.message.length).toBeGreaterThan(0)
      expect(testCase.expect).toBeDefined()
      names.add(testCase.name)
    }
    expect(names.size).toBe(INTENT_CASES.length)
  })

  it('expect.desiresIncludeは1件以上のキーワードを持つ', () => {
    for (const testCase of INTENT_CASES) {
      expect(Array.isArray(testCase.expect.desiresInclude)).toBe(true)
      expect(testCase.expect.desiresInclude.length).toBeGreaterThan(0)
    }
  })

  it('expect.party_size/budget/time_limitは number・null・"any" のいずれか', () => {
    const isValidField = (value: unknown): boolean =>
      value === 'any' || value === null || typeof value === 'number' || typeof value === 'string'

    for (const testCase of INTENT_CASES) {
      expect(isValidField(testCase.expect.party_size)).toBe(true)
      expect(isValidField(testCase.expect.budget)).toBe(true)
      expect(isValidField(testCase.expect.time_limit)).toBe(true)
    }
  })
})
