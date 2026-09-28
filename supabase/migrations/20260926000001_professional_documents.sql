-- Cria a tabela de documentos dos profissionais
CREATE TABLE IF NOT EXISTS public.professional_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_profile_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('CPF', 'RG', 'CNH', 'SELFIE', 'PROOF_OF_ADDRESS', 'OTHER')),
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED')),
  review_notes TEXT,
  reviewed_by UUID REFERENCES public.user_profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index para buscas mais rápidas
CREATE INDEX IF NOT EXISTS idx_prof_docs_professional_id ON public.professional_documents(professional_profile_id);
CREATE INDEX IF NOT EXISTS idx_prof_docs_status ON public.professional_documents(status);

-- Atualiza a tabela professional_profiles (caso verification_status não exista)
ALTER TABLE public.professional_profiles 
ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (verification_status IN ('DRAFT', 'PENDING_VERIFICATION', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED', 'BLOCKED'));

-- Configura o Storage Bucket para os documentos
INSERT INTO storage.buckets (id, name, public) VALUES ('professional_documents', 'professional_documents', false) ON CONFLICT (id) DO NOTHING;

-- RLS: Acesso ao Storage (Apenas o próprio profissional e Admins)
CREATE POLICY "Profissionais podem fazer upload de seus proprios documentos" 
ON storage.objects FOR INSERT TO authenticated 
WITH CHECK (bucket_id = 'professional_documents' AND (auth.uid() = owner));

CREATE POLICY "Profissionais podem ler seus proprios documentos" 
ON storage.objects FOR SELECT TO authenticated 
USING (bucket_id = 'professional_documents' AND (auth.uid() = owner));

-- RLS: Tabela professional_documents
ALTER TABLE public.professional_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profissionais podem ver seus proprios documentos"
ON public.professional_documents FOR SELECT TO authenticated
USING (professional_profile_id IN (
  SELECT id FROM professional_profiles WHERE user_profile_id = (
    SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
  )
));

CREATE POLICY "Profissionais podem inserir seus proprios documentos"
ON public.professional_documents FOR INSERT TO authenticated
WITH CHECK (professional_profile_id IN (
  SELECT id FROM professional_profiles WHERE user_profile_id = (
    SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
  )
));
