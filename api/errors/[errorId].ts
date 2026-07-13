import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabaseAdmin } from '../_lib/supabaseAdmin.js'
import { requireAdmin } from '../_lib/requireAdmin.js'

const VALID_STATUSES = ['new', 'reviewing', 'resolved']

// GET   /api/errors/:errorId — エラー詳細取得（admin のみ）
// PATCH /api/errors/:errorId — エラー状態更新（admin のみ）
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await requireAdmin(req, res))) return

  const { errorId } = req.query
  if (typeof errorId !== 'string') {
    return res.status(400).json({ error: 'errorId is required' })
  }

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('error_logs')
      .select('*')
      .eq('id', errorId)
      .single()

    if (error || !data) {
      return res.status(404).json({ error: 'error log not found' })
    }

    return res.status(200).json(data)
  }

  if (req.method === 'PATCH') {
    const { status } = req.body ?? {}

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of ${VALID_STATUSES.join(', ')}` })
    }

    const { data, error } = await supabaseAdmin
      .from('error_logs')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', errorId)
      .select()
      .single()

    if (error || !data) {
      return res.status(404).json({ error: 'error log not found' })
    }

    return res.status(200).json(data)
  }

  res.setHeader('Allow', 'GET, PATCH')
  return res.status(405).json({ error: 'Method not allowed' })
}
