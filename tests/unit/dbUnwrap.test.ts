// Issue #110: backend/unwrap.ts の単体テスト
import { unwrap } from '../../backend/unwrap.js'

describe('unwrap', () => {
  it('error が null なら data を返す', () => {
    expect(unwrap({ data: { id: '1' }, error: null }, 'ctx')).toEqual({ id: '1' })
  })

  it('data が null でも error が null なら null を返す（存在しない場合のフォールバックに使える）', () => {
    expect(unwrap<{ id: string } | null>({ data: null, error: null }, 'ctx')).toBeNull()
  })

  it('error があれば context 付きの Error を throw する', () => {
    expect(() => unwrap({ data: null, error: { message: 'boom' } }, 'listLikes')).toThrow('listLikes: boom')
  })
})
