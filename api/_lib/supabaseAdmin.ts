import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY and VITE_SUPABASE_URL are required on the server')
}

// RLS をバイパスするサーバー専用クライアント。api/ 配下からのみ使用すること。
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
