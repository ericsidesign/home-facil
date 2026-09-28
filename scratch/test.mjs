import { createClient } from '@supabase/supabase-js'

const supabase = createClient('http://127.0.0.1:54321', process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlZmF1bHQiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY5ODE1OTc3MSwiZXhwIjozMjg1NTU5NzcxfQ.dummy');

async function test() {
  const { data, error } = await supabase.from('bookings').select('id, status, scheduled_date, services(name, id), professional_profiles(user_profiles(full_name))');
  console.log(JSON.stringify({ data, error }, null, 2));
}
test();
