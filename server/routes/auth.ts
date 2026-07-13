import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '../../backend/db.js'

export const authRouter = Router()

const USER_PUBLIC_COLUMNS = 'id, email, name, role, store_id'

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {}

  if (!email || !password) {
    return res.status(400).json({ error: 'email, password は必須です' })
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .select(`${USER_PUBLIC_COLUMNS}, password`)
    .eq('email', email)
    .eq('is_active', true)
    .single()

  if (error || !data) {
    return res.status(401).json({ error: 'メールアドレスまたはパスワードが正しくありません' })
  }

  const isValidPassword = await bcrypt.compare(password, data.password)
  if (!isValidPassword) {
    return res.status(401).json({ error: 'メールアドレスまたはパスワードが正しくありません' })
  }

  const { password: _password, ...user } = data
  res.json(user)
})
