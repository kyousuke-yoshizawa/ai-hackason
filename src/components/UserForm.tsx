import { FormEvent, useState } from 'react'
import { z } from 'zod'
import { Modal } from './Modal'

export interface AdminUser {
  id: string
  email: string
  name: string
  role: 'admin' | 'store_manager' | 'user'
  store_id: string | null
  is_active: boolean
}

export interface UserFormValues {
  email: string
  password?: string
  name: string
  role: AdminUser['role']
}

const createSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(8, 'パスワードは8文字以上で入力してください'),
  name: z.string().min(1, '名前は必須です'),
  role: z.enum(['admin', 'store_manager', 'user']),
})

const editSchema = createSchema.extend({
  password: z.union([z.literal(''), z.string().min(8, 'パスワードは8文字以上で入力してください')]),
})

export function UserForm({
  initialUser,
  onSubmit,
  onCancel,
}: {
  initialUser?: AdminUser
  onSubmit: (values: UserFormValues) => Promise<void>
  onCancel: () => void
}) {
  const isEdit = !!initialUser
  const [values, setValues] = useState<UserFormValues>({
    email: initialUser?.email ?? '',
    password: '',
    name: initialUser?.name ?? '',
    role: initialUser?.role ?? 'user',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const schema = isEdit ? editSchema : createSchema
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
      const submitValues = { ...values }
      if (isEdit && !submitValues.password) delete submitValues.password
      await onSubmit(submitValues)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal title={isEdit ? 'ユーザ編集' : 'ユーザ新規登録'} onClose={onCancel}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">メールアドレス</label>
          <input
            type="email"
            disabled={isEdit}
            value={values.email}
            onChange={(e) => setValues({ ...values, email: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
          />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            パスワード{isEdit && '（変更する場合のみ入力）'}
          </label>
          <input
            type="password"
            value={values.password}
            onChange={(e) => setValues({ ...values, password: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">名前</label>
          <input
            type="text"
            value={values.name}
            onChange={(e) => setValues({ ...values, name: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">ロール</label>
          <select
            value={values.role}
            onChange={(e) => setValues({ ...values, role: e.target.value as AdminUser['role'] })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="user">user</option>
            <option value="store_manager">store_manager</option>
            <option value="admin">admin</option>
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {isEdit ? '更新' : '登録'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
