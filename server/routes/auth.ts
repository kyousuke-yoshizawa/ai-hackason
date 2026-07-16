import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '../../backend/db.js'
import { requireAuth } from '../middleware/auth.js'
import { sendError, zodError } from '../../backend/http/respond.js'
import { asyncHandler } from '../../backend/http/asyncHandler.js'
import { loginSchema } from '../../backend/domains/auth/schema.js'
import { getPermissionsForRole } from '../../backend/domains/auth/permissionsRepository.js'
import { USER_LOGIN_COLUMNS } from '../../backend/domains/users/columns.js'

export const authRouter = Router()

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    return zodError(res, parsed.error)
  }
  const { email, password } = parsed.data

  const { data, error } = await supabaseAdmin
    .from('users')
    .select(`${USER_LOGIN_COLUMNS}, password`)
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

authRouter.get(
  '/permissions',
  requireAuth,
  asyncHandler(async (req, res) => {
    const permissions = await getPermissionsForRole(req.authedUser!.role)
    res.json({ data: permissions })
  }),
)
