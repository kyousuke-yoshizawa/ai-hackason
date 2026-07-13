import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '../../backend/db.js'
import { sendError, zodError } from '../../backend/http/respond.js'
import { loginSchema } from '../../backend/domains/auth/schema.js'

export const authRouter = Router()

const USER_PUBLIC_COLUMNS = 'id, email, name, role, store_id'

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    return zodError(res, parsed.error)
  }
  const { email, password } = parsed.data

  const { data, error } = await supabaseAdmin
    .from('users')
    .select(`${USER_PUBLIC_COLUMNS}, password`)
    .eq('email', email)
    .eq('is_active', true)
    .single()

  if (error || !data) {
    return sendError(res, 401, 'invalid_credentials', 'メールアドレスまたはパスワードが正しくありません')
  }

  const isValidPassword = await bcrypt.compare(password, data.password)
  if (!isValidPassword) {
    return sendError(res, 401, 'invalid_credentials', 'メールアドレスまたはパスワードが正しくありません')
  }

  const { password: _password, ...user } = data
  res.json(user)
})
