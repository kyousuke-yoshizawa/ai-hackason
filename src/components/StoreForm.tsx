import { FormEvent, useState } from 'react'
import { z } from 'zod'
import { MapPicker } from './MapPicker'
import { Modal } from './Modal'
import type { CongestionLevel } from '../../shared/types/crowd'

export interface AdminStore {
  id: string
  name: string
  category: string
  x: number
  y: number
  open_time: string | null
  close_time: string | null
  price_min: number | null
  price_max: number | null
  // 一覧APIのみが返す集計値（Issue #84）。詳細取得等では未設定の場合がある
  like_count?: number
  avg_rating?: number
  review_count?: number
  crowd_level?: CongestionLevel | null
}

export interface StoreFormValues {
  name: string
  category: string
  x: string
  y: string
  open_time: string
  close_time: string
  price_min: string
  price_max: string
}

const numberField = (label: string, opts: { min?: number; max?: number } = {}) =>
  z
    .string()
    .min(1, `${label}は必須です`)
    .refine((v) => !Number.isNaN(Number(v)), `${label}は数値で入力してください`)
    .refine((v) => opts.min === undefined || Number(v) >= opts.min, `${label}は${opts.min}以上です`)
    .refine((v) => opts.max === undefined || Number(v) <= opts.max, `${label}は${opts.max}以下です`)

const optionalNumberField = (label: string) =>
  z
    .string()
    .refine((v) => v === '' || !Number.isNaN(Number(v)), `${label}は数値で入力してください`)

const schema = z
  .object({
    name: z.string().min(1, '店舗名は必須です'),
    category: z.string().min(1, 'カテゴリは必須です'),
    x: numberField('X座標', { min: 0, max: 400 }),
    y: numberField('Y座標', { min: 0, max: 400 }),
    open_time: z.string(),
    close_time: z.string(),
    price_min: optionalNumberField('価格帯下限'),
    price_max: optionalNumberField('価格帯上限'),
  })
  .refine(
    (v) => v.price_min === '' || v.price_max === '' || Number(v.price_min) <= Number(v.price_max),
    { message: '価格帯下限は上限以下である必要があります', path: ['price_max'] }
  )

export function StoreForm({
  initialStore,
  onSubmit,
  onCancel,
}: {
  initialStore?: AdminStore
  onSubmit: (values: {
    name: string
    category: string
    x: number
    y: number
    open_time: string | null
    close_time: string | null
    price_min: number | null
    price_max: number | null
  }) => Promise<void>
  onCancel: () => void
}) {
  const isEdit = !!initialStore
  const [values, setValues] = useState<StoreFormValues>({
    name: initialStore?.name ?? '',
    category: initialStore?.category ?? '',
    x: initialStore ? String(initialStore.x) : '',
    y: initialStore ? String(initialStore.y) : '',
    open_time: initialStore?.open_time ?? '',
    close_time: initialStore?.close_time ?? '',
    price_min: initialStore?.price_min != null ? String(initialStore.price_min) : '',
    price_max: initialStore?.price_max != null ? String(initialStore.price_max) : '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const result = schema.safeParse(values)

    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        fieldErrors[String(issue.path[0])] = issue.message
      }
      setErrors(fieldErrors)
      return
    }

    setErrors({})
    setIsSubmitting(true)
    try {
      await onSubmit({
        name: values.name,
        category: values.category,
        x: Number(values.x),
        y: Number(values.y),
        open_time: values.open_time || null,
        close_time: values.close_time || null,
        price_min: values.price_min === '' ? null : Number(values.price_min),
        price_max: values.price_max === '' ? null : Number(values.price_max),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const field = (key: keyof StoreFormValues, label: string, type = 'text') => (
    <div>
      <label className="ac-label">{label}</label>
      <input
        type={type}
        value={values[key]}
        onChange={(e) => setValues({ ...values, [key]: e.target.value })}
        className="ac-input"
      />
      {errors[key] && <p className="mt-1 text-xs font-bold text-bubble-600">{errors[key]}</p>}
    </div>
  )

  return (
    <Modal title={isEdit ? '店舗編集' : '店舗新規登録'} onClose={onCancel}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {field('name', '店舗名')}
        {field('category', 'カテゴリ')}
        <MapPicker
          x={values.x === '' ? null : Number(values.x)}
          y={values.y === '' ? null : Number(values.y)}
          onPick={(x, y) => setValues({ ...values, x: String(x), y: String(y) })}
        />
        <div className="grid grid-cols-2 gap-3">
          {field('x', 'X座標 (0-400)', 'number')}
          {field('y', 'Y座標 (0-400)', 'number')}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {field('open_time', '開店時刻', 'time')}
          {field('close_time', '閉店時刻', 'time')}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {field('price_min', '価格帯下限', 'number')}
          {field('price_max', '価格帯上限', 'number')}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onCancel} className="ac-btn-secondary">
            キャンセル
          </button>
          <button type="submit" disabled={isSubmitting} className="ac-btn-primary">
            {isEdit ? '更新' : '登録'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
