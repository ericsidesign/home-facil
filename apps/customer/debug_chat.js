const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vykssekdxzqgkdsqwgcv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5a3NzZWtkeHpxZ2tkc3F3Z2N2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxMDc0NDAsImV4cCI6MjEwNTY4MzQ0MH0.-lQ5xpnCRU92UCwEp6N9m1klAqPc2VsJwdJJPas-2Aw';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fix() {
  console.log("Fixing broken bookings...");
  const realCustomerId = '82653da5-df1b-4e62-81f3-56c99987873e';
  
  const { data: updated, error } = await supabase
    .from('bookings')
    .update({ customer_id: realCustomerId })
    .eq('customer_id', '00000000-0000-0000-0000-000000000000');
    
  if (error) {
    console.error("Error updating bookings:", error);
  } else {
    console.log("Updated successfully!");
  }
}

fix();
