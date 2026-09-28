const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vykssekdxzqgkdsqwgcv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5a3NzZWtkeHpxZ2tkc3F3Z2N2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxMDc0NDAsImV4cCI6MjEwNTY4MzQ0MH0.-lQ5xpnCRU92UCwEp6N9m1klAqPc2VsJwdJJPas-2Aw';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Checking conversations...");
  const { data: convs, error: errC } = await supabase.from('conversations').select('*');
  console.log(convs || errC);

  console.log("Checking messages...");
  const { data: msgs, error: errM } = await supabase.from('messages').select('*');
  console.log(msgs || errM);
  
  console.log("Checking bookings...");
  const { data: bkgs, error: errB } = await supabase.from('bookings').select('id, customer_id, professional_id, professional_profile_id, status').in('status', ['ACCEPTED', 'CONFIRMED']);
  console.log(bkgs || errB);
}

check();
