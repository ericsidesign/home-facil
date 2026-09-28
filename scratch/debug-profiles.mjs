import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'http://127.0.0.1:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '' // We will inject anon key if needed
)

async function test() {
  const { data, error } = await supabase.from('user_profiles').select('*')
  console.log('user_profiles:', data, error)
  const { data: users, error: err2 } = await supabase.auth.admin.listUsers()
  console.log('users:', users, err2)
}
test()
