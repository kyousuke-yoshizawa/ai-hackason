import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabaseAdmin } from '../../backend/db.js'
import { requireAdmin } from '../_http/requireAdmin.js'
import { createErrorLogSchema, updateErrorStatusSchema } from '../../backend/domains/errors/schema.js'
import { sendError, zodError } from '../../backend/http/respond.js'
import { requireMethod } from '../../backend/http/method.js'
import { getPathSegments } from '../_http/segments.js'

// GET  /api/errors  — エラー一覧取得（admin のみ）
// POST /api/errors  — エラーログ記録（内部用、認証不要）
async function handleCollection(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, ['GET', 'POST'])) return

  if (req.method === 'POST') {
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

    return res.status(201).json(data)
  }

  // requireMethod により GET または POST のみ通過する。POST は上で return済みのため、以下は GET。
  if (!(await requireAdmin(req, res))) return

  const { status } = req.query
  let query = supabaseAdmin.from('error_logs').select('*').order('created_at', { ascending: false })

  if (typeof status === 'string') {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    return sendError(res, 500, 'internal_error', error.message)
  }

  return res.status(200).json(data)
}

// GET   /api/errors/:errorId — エラー詳細取得（admin のみ）
// PATCH /api/errors/:errorId — エラー状態更新（admin のみ）
async function handleSingle(req: VercelRequest, res: VercelResponse, errorIdSegment: string | undefined) {
  if (!(await requireAdmin(req, res))) return

  if (typeof errorIdSegment !== 'string') {
    sendError(res, 400, 'validation_error', 'errorId is required')
    return
  }
  const errorId = errorIdSegment

  if (!requireMethod(req, res, ['GET', 'PATCH'])) return

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('error_logs')
      .select('*')
      .eq('id', errorId)
      .single()

    if (error || !data) {
      return sendError(res, 404, 'not_found', 'error log not found')
    }

    return res.status(200).json(data)
  }

  // requireMethod により GET または PATCH のみ通過する。GET は上で return済みのため、以下は PATCH。
  const parsed = updateErrorStatusSchema.safeParse(req.body)
  if (!parsed.success) {
    return zodError(res, parsed.error)
  }
  const { status } = parsed.data

  const { data, error } = await supabaseAdmin
    .from('error_logs')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', errorId)
    .select()
    .single()

  if (error || !data) {
    return sendError(res, 404, 'not_found', 'error log not found')
  }

  return res.status(200).json(data)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const segments = getPathSegments(req, '/api/errors')

  if (segments.length === 0) {
    return handleCollection(req, res)
  }

  if (segments.length === 1) {
    return handleSingle(req, res, segments[0])
  }

  return sendError(res, 404, 'not_found', 'route not found')
}
