import { Router } from 'express'
import { requireAdmin, requireAuth } from '../middleware/auth.js'
import { sendError, zodError } from '../../backend/http/respond.js'
import { asyncHandler } from '../../backend/http/asyncHandler.js'
import { supabaseAdmin } from '../../backend/db.js'
import { createErrorLogSchema, updateErrorStatusSchema } from '../../backend/domains/errors/schema.js'

// GET /api/errors（admin のみ）、POST /api/errors（認証不要、内部エラーログ記録用）、
// GET/PATCH /api/errors/:errorId（admin のみ）にマウントする
export const errorsRouter = Router()

// POST /api/errors — エラーログ記録（内部用、認証不要）
errorsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = createErrorLogSchema.safeParse(req.body)
    if (!parsed.success) {
      return zodError(res, parsed.error)
    }
    const { error_type, message, stack_trace, user_id, affected_resource_id } = parsed.data

    const { data, error } = await supabaseAdmin
      .from('error_logs')
      .insert({ error_type, message, stack_trace, user_id, affected_resource_id })
      .select()
      .single()

    if (error) {
      return sendError(res, 500, 'internal_error', error.message)
    }

    res.status(201).json(data)
  }),
)

// GET /api/errors — エラー一覧取得（admin のみ）
errorsRouter.get(
  '/',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { status } = req.query
    let query = supabaseAdmin.from('error_logs').select('*').order('created_at', { ascending: false })

    if (typeof status === 'string') {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      return sendError(res, 500, 'internal_error', error.message)
    }

    res.status(200).json(data)
  }),
)

// GET /api/errors/:errorId — エラー詳細取得（admin のみ）
errorsRouter.get(
  '/:errorId',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from('error_logs')
      .select('*')
      .eq('id', req.params.errorId)
      .single()

    if (error || !data) {
      return sendError(res, 404, 'not_found', 'error log not found')
    }

    res.status(200).json(data)
  }),
)

// PATCH /api/errors/:errorId — エラー状態更新（admin のみ）
errorsRouter.patch(
  '/:errorId',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const parsed = updateErrorStatusSchema.safeParse(req.body)
    if (!parsed.success) {
      return zodError(res, parsed.error)
    }
    const { status } = parsed.data

    const { data, error } = await supabaseAdmin
      .from('error_logs')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', req.params.errorId)
      .select()
      .single()

    if (error || !data) {
      return sendError(res, 404, 'not_found', 'error log not found')
    }

    res.status(200).json(data)
  }),
)
