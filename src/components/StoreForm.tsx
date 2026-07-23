import { z } from 'zod'
import { MapPicker } from './MapPicker'
import { Modal } from './Modal'
import { useZodForm } from '../hooks/useZodForm'
import type { CongestionLevel } from '../../shared/types/crowd'

// 推奨タグ語彙（Issue #126）。自由入力ではなくチェックボックスで選択させる
export const RECOMMENDED_TAGS = [
  '子連れOK',
  '屋内',
  'テラス席',
  'テイクアウト可',
  'デート向き',
  'おひとりさま歓迎',
] as const

// 0=日曜〜6=土曜（JSのDate.getDay()と同じ規約、Issue #127）
export const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const

export const SUB_AREA_OPTIONS = ['駅前エリア', '商店街エリア', '公園エリア', '広場エリア'] as const

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
  // ライブ混雑報告（crowd_status由来）の報告時刻（Issue #134）。パターン由来・未報告はnull
  crowd_reported_at?: string | null
  // 当日0時JST以降にプラン生成候補へ含まれた回数（Issue #136）
  today_suggestion_count?: number
  // 一覧APIのみが返す代表写真URL（Issue #132）。store_mediaが無い店舗はnull
  thumbnail_url?: string | null
  // 店舗属性の追加項目（Issue #126-130）
  tags?: string[]
  closed_days?: number[]
  last_order_time?: string | null
  description?: string | null
  sub_area?: string | null
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
  last_order_time: string
  description: string
  sub_area: string
  tags: string[]
  closed_days: number[]
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

const schema: z.ZodType<StoreFormValues> = z
  .object({
    name: z.string().min(1, '店舗名は必須です'),
    category: z.string().min(1, 'カテゴリは必須です'),
    x: numberField('X座標', { min: 0, max: 400 }),
    y: numberField('Y座標', { min: 0, max: 400 }),
    open_time: z.string(),
    close_time: z.string(),
    price_min: optionalNumberField('価格帯下限'),
    price_max: optionalNumberField('価格帯上限'),
    last_order_time: z.string(),
    description: z.string().max(500, '紹介文は500文字以内で入力してください'),
    sub_area: z.string(),
    tags: z.array(z.string().max(20, 'タグは20文字以内で入力してください')).max(10, 'タグは10個までです'),
    closed_days: z.array(z.number().int().min(0).max(6)).max(7, '定休日は7個までです'),
  })
  .refine(
    (v) => v.price_min === '' || v.price_max === '' || Number(v.price_min) <= Number(v.price_max),
    { message: '価格帯下限は上限以下である必要があります', path: ['price_max'] }
  )

export function StoreForm({
  initialStore,
  onSubmit,
  onCancel,
  existingStores,
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
    tags: string[]
    closed_days: number[]
    last_order_time: string | null
    description: string | null
    sub_area: string | null
  }) => Promise<void>
  onCancel: () => void
  existingStores?: { name: string; x: number; y: number }[]
}) {
  const isEdit = !!initialStore
  const { values, setValue, setValues, errors, isSubmitting, handleSubmit } = useZodForm<StoreFormValues>(
    schema,
    {
      name: initialStore?.name ?? '',
      category: initialStore?.category ?? '',
      x: initialStore ? String(initialStore.x) : '',
      y: initialStore ? String(initialStore.y) : '',
      open_time: initialStore?.open_time ?? '',
      close_time: initialStore?.close_time ?? '',
      price_min: initialStore?.price_min != null ? String(initialStore.price_min) : '',
      price_max: initialStore?.price_max != null ? String(initialStore.price_max) : '',
      last_order_time: initialStore?.last_order_time ?? '',
      description: initialStore?.description ?? '',
      sub_area: initialStore?.sub_area ?? '',
      tags: initialStore?.tags ?? [],
      closed_days: initialStore?.closed_days ?? [],
    }
  )

  const toggleTag = (tag: string) => {
    setValues((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag],
    }))
  }

  const toggleClosedDay = (day: number) => {
    setValues((prev) => ({
      ...prev,
      closed_days: prev.closed_days.includes(day)
        ? prev.closed_days.filter((d) => d !== day)
        : [...prev.closed_days, day],
    }))
  }

  const onValid = async (data: StoreFormValues) => {
    await onSubmit({
      name: data.name,
      category: data.category,
      x: Number(data.x),
      y: Number(data.y),
      open_time: data.open_time || null,
      close_time: data.close_time || null,
      price_min: data.price_min === '' ? null : Number(data.price_min),
      price_max: data.price_max === '' ? null : Number(data.price_max),
      tags: data.tags,
      closed_days: data.closed_days,
      last_order_time: data.last_order_time || null,
      description: data.description || null,
      sub_area: data.sub_area || null,
    })
  }

  const field = (key: keyof Omit<StoreFormValues, 'tags' | 'closed_days'>, label: string, type = 'text') => (
    <div>
      <label className="ac-label">{label}</label>
      <input
        type={type}
        value={values[key]}
        onChange={(e) => setValue(key, e.target.value)}
        className="ac-input"
      />
      {errors[key] && <p className="mt-1 text-xs font-bold text-bubble-600">{errors[key]}</p>}
    </div>
  )

  return (
    <Modal title={isEdit ? '店舗編集' : '店舗新規登録'} onClose={onCancel}>
      <form onSubmit={handleSubmit(onValid)} className="space-y-4">
        {field('name', '店舗名')}
        {field('category', 'カテゴリ')}
        <MapPicker
          x={values.x === '' ? null : Number(values.x)}
          y={values.y === '' ? null : Number(values.y)}
          onPick={(x, y) => setValues((prev) => ({ ...prev, x: String(x), y: String(y) }))}
          existingStores={existingStores}
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

        <div>
          <label className="ac-label">タグ（任意・複数選択可）</label>
          <div className="flex flex-wrap gap-3">
            {RECOMMENDED_TAGS.map((tag) => (
              <label key={tag} className="flex items-center gap-1.5 text-sm text-wood-700">
                <input
                  type="checkbox"
                  checked={values.tags.includes(tag)}
                  onChange={() => toggleTag(tag)}
                  className="h-4 w-4 rounded border-2 border-sand-300 text-leaf-500 focus:ring-2 focus:ring-leaf-300"
                />
                {tag}
              </label>
            ))}
          </div>
          {errors.tags && <p className="mt-1 text-xs font-bold text-bubble-600">{errors.tags}</p>}
        </div>

        <div>
          <label className="ac-label">定休日（任意・複数選択可）</label>
          <div className="flex flex-wrap gap-3">
            {DAY_LABELS.map((label, day) => (
              <label key={day} className="flex items-center gap-1.5 text-sm text-wood-700">
                <input
                  type="checkbox"
                  checked={values.closed_days.includes(day)}
                  onChange={() => toggleClosedDay(day)}
                  className="h-4 w-4 rounded border-2 border-sand-300 text-leaf-500 focus:ring-2 focus:ring-leaf-300"
                />
                {label}
              </label>
            ))}
          </div>
          {errors.closed_days && <p className="mt-1 text-xs font-bold text-bubble-600">{errors.closed_days}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {field('last_order_time', 'L.O.（任意）', 'time')}
          <div>
            <label className="ac-label">エリア（任意）</label>
            <select
              value={values.sub_area}
              onChange={(e) => setValue('sub_area', e.target.value)}
              className="ac-input"
            >
              <option value="">未設定</option>
              {SUB_AREA_OPTIONS.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="ac-label">紹介文（任意）</label>
          <textarea
            value={values.description}
            onChange={(e) => setValue('description', e.target.value.slice(0, 500))}
            rows={3}
            className="ac-input resize-none text-sm"
          />
          <p className="mt-1 text-right text-xs text-wood-400">{values.description.length} / 500</p>
          {errors.description && <p className="mt-1 text-xs font-bold text-bubble-600">{errors.description}</p>}
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
