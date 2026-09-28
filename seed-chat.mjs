import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('apps/customer/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  const mockId = '11111111-1111-1111-1111-111111111111';
  
  console.log('Verificando se a conversa mock existe...');
  const { data: existing } = await supabase.from('conversations').select('id').eq('id', mockId).single();
  
  if (!existing) {
    console.log('Inserindo conversa mock no Supabase...');
    const { error } = await supabase.from('conversations').insert({ id: mockId });
    if (error) {
      console.error('Erro ao inserir conversa:', error.message);
    } else {
      console.log('Conversa inserida com sucesso!');
    }
  } else {
    console.log('Conversa mock já existe.');
  }
}

seed();
