import type { FormEvent } from 'react'
import { useState } from 'react'
import type { z } from 'zod'

type FieldErrors = Record<string, string>

/**
 * zodスキーマに基づくフォームの values/errors/isSubmitting state と
 * submitハンドラを集約する。スキーマはtransformを持たない前提
 * （Output === Input === Values）で、StoreForm/UserFormの既存挙動
 * （safeParse失敗時は issue.path[0] ごとに fieldErrors を構築）を踏襲する。
 */
export function useZodForm<Values extends object>(
  schema: z.ZodType<Values>,
  initialValues: Values
) {
  const [values, setValues] = useState<Values>(initialValues)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const setValue = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit =
    (onValid: (data: Values) => void | Promise<void>) => async (e: FormEvent) => {
      e.preventDefault()
      const result = schema.safeParse(values)

      if (!result.success) {
        const fieldErrors: FieldErrors = {}
        for (const issue of result.error.issues) {
          fieldErrors[String(issue.path[0])] = issue.message
        }
        setErrors(fieldErrors)
        return
      }

      setErrors({})
      setIsSubmitting(true)
      try {
        await onValid(result.data)
      } finally {
        setIsSubmitting(false)
      }
    }

  return { values, setValue, setValues, errors, setErrors, isSubmitting, handleSubmit }
}
