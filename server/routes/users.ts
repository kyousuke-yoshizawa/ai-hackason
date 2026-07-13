import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '../../backend/db.js'
import { requireAdmin, requireAdminOrSelf, requireAuth } from '../middleware/auth.js'
import { sendError, zodError } from '../../backend/http/respond.js'
import { createUserSchema, updateUserSchema } from '../../backend/domains/users/schema.js'

export const usersRouter = Router()

const USER_PUBLIC_COLUMNS = 'id, email, name, role, store_id, is_active, created_at, updated_at'

usersRouter.post('/', requireAuth, requireAdmin, async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body)
  if (!parsed.success) {
    return zodError(res, parsed.error)
  }
  const { email, password, name, role } = parsed.data

  const passwordHash = await bcrypt.hash(password, 10)

  const { data, error } = await supabaseAdmin
    .from('users')
    .insert({ email, password: passwordHash, name, role })
    .select(USER_PUBLIC_COLUMNS)
    .single()

  if (error) {
    if (error.code === '23505') {
      return sendError(res, 409, 'email_taken', 'このメールアドレスは既に登録されています')
    }
    return sendError(res, 500, 'internal_error', error.message)
  }

  res.status(201).json(data)
})

usersRouter.get('/', requireAuth, requireAdmin, async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20))
  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, error, count } = await supabaseAdmin
    .from('users')
    .select(USER_PUBLIC_COLUMNS, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    return sendError(res, 500, 'internal_error', error.message)
  }

  res.json({ data, page, limit, total: count ?? 0 })
})

usersRouter.get('/:id', requireAuth, requireAdminOrSelf(), async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select(USER_PUBLIC_COLUMNS)
    .eq('id', req.params.id)
    .single()

  if (error || !data) {
    return sendError(res, 404, 'not_found', 'ユーザが見つかりません')
  }

  res.json(data)
})

usersRouter.put('/:id', requireAuth, requireAdminOrSelf(), async (req, res) => {
  const parsed = updateUserSchema.safeParse(req.body)
  if (!parsed.success) {
    return zodError(res, parsed.error)
  }
  const { name, role, password } = parsed.data
  const updates: Record<string, unknown> = {}

  if (name !== undefined) updates.name = name
  if (password !== undefined) updates.password = await bcrypt.hash(password, 10)

  if (role !== undefined) {
    if (req.authedUser?.role !== 'admin') {
      return sendError(res, 403, 'forbidden', 'role の変更は管理者のみ可能です')
    }
    updates.role = role
  }

  if (Object.keys(updates).length === 0) {
    return sendError(res, 400, 'no_updates', '更新内容がありません')
  }
  updates.updated_at = new Date().toISOString()

  const { data, error } = await supabaseAdmin
    .from('users')
    .update(updates)
    .eq('id', req.params.id)
    .select(USER_PUBLIC_COLUMNS)
    .single()

  if (error || !data) {
    return sendError(res, 404, 'not_found', 'ユーザが見つかりません')
  }

  res.json(data)
})

usersRouter.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('users')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select(USER_PUBLIC_COLUMNS)
    .single()

  if (error || !data) {
    return sendError(res, 404, 'not_found', 'ユーザが見つかりません')
  }

  res.json({ message: 'ユーザを無効化しました', user: data })
})
