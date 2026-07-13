import { createClient } from '@supabase/supabase-js'
import { env } from '../config/env.js'

if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for the server')
}

export const supabaseAdmin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey)
