-- Adiciona coluna de portfólio na tabela professional_profiles
ALTER TABLE public.professional_profiles 
ADD COLUMN IF NOT EXISTS portfolio_urls JSONB DEFAULT '[]'::jsonb;

-- Criação de Buckets de Storage (Avatares e Portfólios)
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('avatars', 'avatars', true),
  ('portfolios', 'portfolios', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Segurança para Storage: Avatars
CREATE POLICY "Avatars Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Avatars Upload" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Avatars Update" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id = 'avatars');

-- Políticas de Segurança para Storage: Portfolios
CREATE POLICY "Portfolios Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'portfolios');

CREATE POLICY "Portfolios Upload" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'portfolios');

CREATE POLICY "Portfolios Update" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id = 'portfolios');
