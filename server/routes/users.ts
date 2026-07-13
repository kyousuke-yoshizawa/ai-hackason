import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '../../backend/db.js'
import { requireAdmin, requireAdminOrSelf, requireAuth } from '../middleware/auth.js'

export const usersRouter = Router()

const USER_PUBLIC_COLUMNS = 'id, email, name, role, store_id, is_active, created_at, updated_at'
const ALLOWED_ROLES = ['admin', 'store_manager', 'user']

usersRouter.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { email, password, name, role = 'user' } = req.body ?? {}

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'email, password, name は必須です' })
  }
  if (!ALLOWED_ROLES.includes(role)) {
    return res.status(400).json({ error: `role は ${ALLOWED_ROLES.join('/')} のいずれかです` })
  }

  const passwordHash = await bcrypt.hash(password, 10)

  const { data, error } = await supabaseAdmin
    .from('users')
    .insert({ email, password: passwordHash, name, role })
    .select(USER_PUBLIC_COLUMNS)
    .single()

  if (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'このメールアドレスは既に登録されています' })
    }
    return res.status(500).json({ error: error.message })
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
    return res.status(500).json({ error: error.message })
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
    return res.status(404).json({ error: 'ユーザが見つかりません' })
  }

  res.json(data)
})

usersRouter.put('/:id', requireAuth, requireAdminOrSelf(), async (req, res) => {
  const { name, role, password } = req.body ?? {}
  const updates: Record<string, unknown> = {}

  if (name !== undefined) updates.name = name
  if (password !== undefined) updates.password = await bcrypt.hash(password, 10)

  if (role !== undefined) {
    if (req.authedUser?.role !== 'admin') {
      return res.status(403).json({ error: 'role の変更は管理者のみ可能です' })
    }
    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ error: `role は ${ALLOWED_ROLES.join('/')} のいずれかです` })
    }
    updates.role = role
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: '更新内容がありません' })
  }
  updates.updated_at = new Date().toISOString()

  const { data, error } = await supabaseAdmin
    .from('users')
    .update(updates)
    .eq('id', req.params.id)
    .select(USER_PUBLIC_COLUMNS)
    .single()

  if (error || !data) {
    return res.status(404).json({ error: 'ユーザが見つかりません' })
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
    return res.status(404).json({ error: 'ユーザが見つかりません' })
  }

  res.json({ message: 'ユーザを無効化しました', user: data })
})
