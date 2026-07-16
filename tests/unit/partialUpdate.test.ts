// Issue #110: backend/http/partialUpdate.ts の単体テスト
import { buildPartialUpdate } from '../../backend/http/partialUpdate.js'

describe('buildPartialUpdate', () => {
  it('許可キーのうち undefined でない値だけを採用し updated_at を付与する', () => {
    const result = buildPartialUpdate({ name: 'foo', category: undefined, x: 1 }, ['name', 'category', 'x'])
    expect(result).not.toBeNull()
    expect(result).toMatchObject({ name: 'foo', x: 1 })
    expect(result!.category).toBeUndefined()
    expect(typeof result!.updated_at).toBe('string')
  })

  it('許可キーに含まれないフィールドは無視する', () => {
    const result = buildPartialUpdate({ name: 'foo', secret: 'nope' }, ['name'])
    expect(result).toMatchObject({ name: 'foo' })
    expect(result).not.toHaveProperty('secret')
  })

  it('更新対象が何もない場合は null を返す', () => {
    expect(buildPartialUpdate({ name: undefined, x: undefined }, ['name', 'x'])).toBeNull()
  })
})
