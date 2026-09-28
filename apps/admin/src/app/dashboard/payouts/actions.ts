'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function getPayouts() {
  const { data, error } = await supabaseAdmin
    .from('payout_requests')
    .select(`
      *,
      professional_profiles (
        user_profiles (
          full_name
        )
      )
    `)
    .order('requested_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching payouts:', error);
    return [];
  }
  return data || [];
}

export async function updatePayoutStatus(id: string, status: string) {
  const { error } = await supabaseAdmin
    .from('payout_requests')
    .update({ status, processed_at: new Date().toISOString() })
    .eq('id', id);
    
  if (error) {
    console.error('Error updating payout:', error);
  }
}
