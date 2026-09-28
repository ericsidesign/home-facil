import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'http://localhost:54321', // Local supabase or production? 
  // Let's use the local file config if I can find it, or simply use psql!
);
