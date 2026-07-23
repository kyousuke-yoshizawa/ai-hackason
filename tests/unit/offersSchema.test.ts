import { createOfferSchema, updateOfferSchema } from '../../backend/domains/offers/schema'

// Issue #98（S004・オファー機能）
describe('createOfferSchema', () => {
  const validInput = {
    store_id: 'store-1',
    description: '14-16時は狙い目！20%OFF',
    start_time: '14:00',
    end_time: '16:00',
  }

  it('accepts a valid input and defaults weekdays_only/is_active to undefined (repository applies defaults)', () => {
    const result = createOfferSchema.safeParse(validInput)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.weekdays_only).toBeUndefined()
      expect(result.data.is_active).toBeUndefined()
    }
  })

  it('accepts explicit weekdays_only/is_active', () => {
    const result = createOfferSchema.safeParse({ ...validInput, weekdays_only: true, is_active: false })

    expect(result.success).toBe(true)
  })

  it('rejects a missing description', () => {
    const { description: _description, ...rest } = validInput
    const result = createOfferSchema.safeParse(rest)

    expect(result.success).toBe(false)
  })

  it('rejects an empty description', () => {
    const result = createOfferSchema.safeParse({ ...validInput, description: '' })

    expect(result.success).toBe(false)
  })

  it('rejects a start_time/end_time not in HH:MM format', () => {
    expect(createOfferSchema.safeParse({ ...validInput, start_time: '14時' }).success).toBe(false)
    expect(createOfferSchema.safeParse({ ...validInput, start_time: '14:0' }).success).toBe(false)
    expect(createOfferSchema.safeParse({ ...validInput, end_time: '24:00' }).success).toBe(false)
    expect(createOfferSchema.safeParse({ ...validInput, end_time: '16:60' }).success).toBe(false)
  })

  it('rejects when start_time is not before end_time', () => {
    expect(createOfferSchema.safeParse({ ...validInput, start_time: '16:00', end_time: '14:00' }).success).toBe(false)
    expect(createOfferSchema.safeParse({ ...validInput, start_time: '14:00', end_time: '14:00' }).success).toBe(false)
  })

  it('rejects a missing store_id', () => {
    const { store_id: _storeId, ...rest } = validInput
    const result = createOfferSchema.safeParse(rest)

    expect(result.success).toBe(false)
  })
})

describe('updateOfferSchema', () => {
  it('accepts a partial update of only description', () => {
    const result = updateOfferSchema.safeParse({ description: '新しいオファー内容' })

    expect(result.success).toBe(true)
  })

  it('accepts an empty object (no-op update; route layer rejects "no updates" separately)', () => {
    const result = updateOfferSchema.safeParse({})

    expect(result.success).toBe(true)
  })

  it('rejects start_time/end_time when both provided but start is not before end', () => {
    const result = updateOfferSchema.safeParse({ start_time: '16:00', end_time: '14:00' })

    expect(result.success).toBe(false)
  })

  it('accepts start_time alone without validating against an unseen existing end_time', () => {
    // 既存レコードのend_timeとの比較まではzodスキーマ単体では検証しない（呼び出し側の責務外）
    const result = updateOfferSchema.safeParse({ start_time: '20:00' })

    expect(result.success).toBe(true)
  })
})
