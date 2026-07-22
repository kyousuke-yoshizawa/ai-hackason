import { Router } from 'express'
import { supabaseAdmin } from '../../backend/db.js'
import { requireAdmin, requireAdminOrStoreManager, requireAuth } from '../middleware/auth.js'
import { sendError, zodError } from '../../backend/http/respond.js'
import { createStoreSchema, updateStoreSchema } from '../../backend/domains/stores/schema.js'
import { enrichStoresWithAggregates } from '../../backend/domains/stores/enrichWithAggregates.js'
import { STORE_COLUMNS } from '../../backend/domains/stores/columns.js'
import { buildPartialUpdate } from '../../backend/http/partialUpdate.js'

export const storesRouter = Router()

storesRouter.post('/', requireAuth, requireAdmin, async (req, res) => {
  const parsed = createStoreSchema.safeParse(req.body)
  if (!parsed.success) {
    return zodError(res, parsed.error)
  }
  const {
    name,
    category,
    x,
    y,
    open_time,
    close_time,
    price_min,
    price_max,
    tags,
    closed_days,
    last_order_time,
    description,
    sub_area,
  } = parsed.data

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
      tags,
      closed_days,
      last_order_time,
      description,
      sub_area,
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

  const enriched = await enrichStoresWithAggregates(data ?? [])

  res.json({ data: enriched })
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
  const updates = buildPartialUpdate(parsed.data, [
    'name',
    'category',
    'x',
    'y',
    'open_time',
    'close_time',
    'price_min',
    'price_max',
    'tags',
    'closed_days',
    'last_order_time',
    'description',
    'sub_area',
  ])
  if (!updates) {
    return sendError(res, 400, 'no_updates', '更新内容がありません')
  }

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
