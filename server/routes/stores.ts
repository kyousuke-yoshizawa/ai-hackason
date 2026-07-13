import { Router } from 'express'
import { supabaseAdmin } from '../../backend/db.js'
import { requireAdmin, requireAdminOrStoreManager, requireAuth } from '../middleware/auth.js'
import { sendError, zodError } from '../../backend/http/respond.js'
import { createStoreSchema, updateStoreSchema } from '../../backend/domains/stores/schema.js'

export const storesRouter = Router()

const STORE_COLUMNS =
  'id, name, category, x, y, open_time, close_time, price_min, price_max, created_by, created_at, updated_at'

storesRouter.post('/', requireAuth, requireAdmin, async (req, res) => {
  const parsed = createStoreSchema.safeParse(req.body)
  if (!parsed.success) {
    return zodError(res, parsed.error)
  }
  const { name, category, x, y, open_time, close_time, price_min, price_max } = parsed.data

  const { data, error } = await supabaseAdmin
    .from('stores')
    .insert({
      name,
      category,
      x,
      y,
      open_time,
      close_time,
      price_min,
      price_max,
      created_by: req.authedUser!.id,
    })
    .select(STORE_COLUMNS)
    .single()

  if (error) {
    return sendError(res, 500, 'internal_error', error.message)
  }

  res.status(201).json(data)
})

storesRouter.get('/', async (req, res) => {
  let query = supabaseAdmin.from('stores').select(STORE_COLUMNS).is('deleted_at', null)

  if (req.query.category) {
    query = query.eq('category', String(req.query.category))
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    return sendError(res, 500, 'internal_error', error.message)
  }

  res.json({ data })
})

storesRouter.get('/:id', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('stores')
    .select(STORE_COLUMNS)
    .eq('id', req.params.id)
    .is('deleted_at', null)
    .single()

  if (error || !data) {
    return sendError(res, 404, 'not_found', '店舗が見つかりません')
  }

  res.json(data)
})

storesRouter.put('/:id', requireAuth, requireAdminOrStoreManager(), async (req, res) => {
  const parsed = updateStoreSchema.safeParse(req.body)
  if (!parsed.success) {
    return zodError(res, parsed.error)
  }
  const { name, category, x, y, open_time, close_time, price_min, price_max } = parsed.data
  const updates: Record<string, unknown> = {}

  if (name !== undefined) updates.name = name
  if (category !== undefined) updates.category = category
  if (x !== undefined) updates.x = x
  if (y !== undefined) updates.y = y
  if (open_time !== undefined) updates.open_time = open_time
  if (close_time !== undefined) updates.close_time = close_time
  if (price_min !== undefined) updates.price_min = price_min
  if (price_max !== undefined) updates.price_max = price_max

  if (Object.keys(updates).length === 0) {
    return sendError(res, 400, 'no_updates', '更新内容がありません')
  }
  updates.updated_at = new Date().toISOString()

  const { data, error } = await supabaseAdmin
    .from('stores')
    .update(updates)
    .eq('id', req.params.id)
    .is('deleted_at', null)
    .select(STORE_COLUMNS)
    .single()

  if (error || !data) {
    return sendError(res, 404, 'not_found', '店舗が見つかりません')
  }

  res.json(data)
})

storesRouter.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('stores')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .is('deleted_at', null)
    .select(STORE_COLUMNS)
    .single()

  if (error || !data) {
    return sendError(res, 404, 'not_found', '店舗が見つかりません')
  }

  res.json({ message: '店舗を削除しました', store: data })
})
