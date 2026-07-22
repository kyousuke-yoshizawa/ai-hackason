import { z } from 'zod'
import { Modal } from './Modal'
import { useZodForm } from '../hooks/useZodForm'

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
  const schema: z.ZodType<UserFormValues> = isEdit ? editSchema : createSchema
  const { values, setValue, errors, isSubmitting, handleSubmit } = useZodForm<UserFormValues>(schema, {
    email: initialUser?.email ?? '',
    password: '',
    name: initialUser?.name ?? '',
    role: initialUser?.role ?? 'user',
  })

  const onValid = async (data: UserFormValues) => {
    const submitValues = { ...data }
    if (isEdit && !submitValues.password) delete submitValues.password
    await onSubmit(submitValues)
  }

  return (
    <Modal title={isEdit ? 'ユーザ編集' : 'ユーザ新規登録'} onClose={onCancel}>
      <form onSubmit={handleSubmit(onValid)} className="space-y-4">
        <div>
          <label className="ac-label">メールアドレス</label>
          <input
            type="email"
            disabled={isEdit}
            value={values.email}
            onChange={(e) => setValue('email', e.target.value)}
            className="ac-input disabled:bg-sand-200/60 disabled:text-wood-400"
          />
          {errors.email && <p className="mt-1 text-xs font-bold text-bubble-600">{errors.email}</p>}
        </div>

        <div>
          <label className="ac-label">
            パスワード{isEdit && '（変更する場合のみ入力）'}
          </label>
          <input
            type="password"
            value={values.password}
            onChange={(e) => setValue('password', e.target.value)}
            className="ac-input"
          />
          {errors.password && <p className="mt-1 text-xs font-bold text-bubble-600">{errors.password}</p>}
        </div>

        <div>
          <label className="ac-label">名前</label>
          <input
            type="text"
            value={values.name}
            onChange={(e) => setValue('name', e.target.value)}
            className="ac-input"
          />
          {errors.name && <p className="mt-1 text-xs font-bold text-bubble-600">{errors.name}</p>}
        </div>

        <div>
          <label className="ac-label">ロール</label>
          <select
            value={values.role}
            onChange={(e) => setValue('role', e.target.value as AdminUser['role'])}
            className="ac-input"
          >
            <option value="user">user</option>
            <option value="store_manager">store_manager</option>
            <option value="admin">admin</option>
          </select>
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
