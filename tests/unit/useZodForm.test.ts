import { act, renderHook } from '@testing-library/react'
import { z } from 'zod'
import { useZodForm } from '../../src/hooks/useZodForm'

const schema = z.object({
  name: z.string().min(1, '名前は必須です'),
  age: z.string().refine((v) => !Number.isNaN(Number(v)), '年齢は数値で入力してください'),
})

function fakeSubmitEvent() {
  return { preventDefault: jest.fn() } as unknown as React.FormEvent
}

describe('useZodForm', () => {
  it('初期値をvaluesに反映する', () => {
    const { result } = renderHook(() => useZodForm(schema, { name: '', age: '' }))
    expect(result.current.values).toEqual({ name: '', age: '' })
    expect(result.current.errors).toEqual({})
    expect(result.current.isSubmitting).toBe(false)
  })

  it('setValueで指定フィールドのみ更新する', () => {
    const { result } = renderHook(() => useZodForm(schema, { name: '', age: '' }))

    act(() => {
      result.current.setValue('name', '太郎')
    })

    expect(result.current.values).toEqual({ name: '太郎', age: '' })
  })

  it('バリデーション失敗時、issue.path[0]ごとにfieldErrorsを構築しonValidを呼ばない', async () => {
    const onValid = jest.fn()
    const { result } = renderHook(() => useZodForm(schema, { name: '', age: 'abc' }))

    await act(async () => {
      await result.current.handleSubmit(onValid)(fakeSubmitEvent())
    })

    expect(onValid).not.toHaveBeenCalled()
    expect(result.current.errors).toEqual({
      name: '名前は必須です',
      age: '年齢は数値で入力してください',
    })
    expect(result.current.isSubmitting).toBe(false)
  })

  it('バリデーション成功時、errorsを解除しonValidにパース済みデータを渡す', async () => {
    const onValid = jest.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useZodForm(schema, { name: '', age: '' }))

    act(() => {
      result.current.setValue('name', '太郎')
      result.current.setValue('age', '20')
    })

    await act(async () => {
      await result.current.handleSubmit(onValid)(fakeSubmitEvent())
    })

    expect(onValid).toHaveBeenCalledWith({ name: '太郎', age: '20' })
    expect(result.current.errors).toEqual({})
    expect(result.current.isSubmitting).toBe(false)
  })

  it('onValid実行中はisSubmittingがtrueになり、完了後falseに戻る', async () => {
    let resolveOnValid: () => void = () => {}
    const onValid = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveOnValid = resolve
        })
    )
    const { result } = renderHook(() => useZodForm(schema, { name: '太郎', age: '20' }))

    let submitPromise: Promise<void> = Promise.resolve()
    act(() => {
      submitPromise = result.current.handleSubmit(onValid)(fakeSubmitEvent())
    })

    expect(result.current.isSubmitting).toBe(true)

    await act(async () => {
      resolveOnValid()
      await submitPromise
    })

    expect(result.current.isSubmitting).toBe(false)
  })
})
