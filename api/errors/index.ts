import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabaseAdmin } from '../../backend/db.js'
import { requireAdmin } from '../_http/requireAdmin.js'

// GET  /api/errors  — エラー一覧取得（admin のみ）
// POST /api/errors  — エラーログ記録（内部用、認証不要）
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    const { error_type, message, stack_trace, user_id, affected_resource_id } = req.body ?? {}

    if (!error_type || !message) {
      return res.status(400).json({ error: 'error_type and message are required' })
    }

    const { data, error } = await supabaseAdmin
      .from('error_logs')
      .insert({ error_type, message, stack_trace, user_id, affected_resource_id })
      .select()
      .single()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.status(201).json(data)
  }

  if (req.method === 'GET') {
    if (!(await requireAdmin(req, res))) return

    const { status } = req.query
    let query = supabaseAdmin.from('error_logs').select('*').order('created_at', { ascending: false })

    if (typeof status === 'string') {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json(data)
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Method not allowed' })
}
