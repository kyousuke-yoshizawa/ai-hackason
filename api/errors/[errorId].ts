import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabaseAdmin } from '../../backend/db.js'
import { requireAdmin } from '../_http/requireAdmin.js'
import { updateErrorStatusSchema } from '../../backend/domains/errors/schema.js'
import { sendError, zodError } from '../../backend/http/respond.js'

// GET   /api/errors/:errorId — エラー詳細取得（admin のみ）
// PATCH /api/errors/:errorId — エラー状態更新（admin のみ）
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await requireAdmin(req, res))) return

  const { errorId } = req.query
  if (typeof errorId !== 'string') {
    return sendError(res, 400, 'validation_error', 'errorId is required')
  }

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

  if (req.method === 'PATCH') {
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

  res.setHeader('Allow', 'GET, PATCH')
  return sendError(res, 405, 'method_not_allowed', 'Method not allowed')
}
