import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://vykssekdxzqgkdsqwgcv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5a3NzZWtkeHpxZ2tkc3F3Z2N2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxMDc0NDAsImV4cCI6MjEwNTY4MzQ0MH0.-lQ5xpnCRU92UCwEp6N9m1klAqPc2VsJwdJJPas-2Aw'
);

async function test() {
  const { data, error } = await supabase.from('reviews').select('*').limit(1);
  if (error) {
    console.error('Error fetching reviews:', error);
  } else {
    console.log('Reviews table exists!', data);
  }
}

test();
