CREATE TABLE IF NOT EXISTS public.professional_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_profile_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  bank_code TEXT,
  agency TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('CHECKING', 'SAVINGS')),
  pix_key TEXT,
  pix_key_type TEXT CHECK (pix_key_type IN ('CPF', 'EMAIL', 'PHONE', 'RANDOM')),
  document_number TEXT NOT NULL, -- O CPF cadastrado na conta bancária para evitar fraudes
  is_verified BOOLEAN NOT NULL DEFAULT false, -- Pode ser verificado manualmente pelo Admin
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Garante que cada profissional tenha apenas 1 conta cadastrada por vez no MVP
  UNIQUE(professional_profile_id)
);

ALTER TABLE public.professional_bank_accounts ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança (RLS)
CREATE POLICY "Profissionais podem ver sua propria conta bancaria"
ON public.professional_bank_accounts FOR SELECT TO authenticated
USING (professional_profile_id IN (
    SELECT id FROM public.professional_profiles WHERE user_profile_id IN (
        SELECT id FROM public.user_profiles WHERE auth_user_id = auth.uid()
    )
));

CREATE POLICY "Profissionais podem inserir sua conta bancaria"
ON public.professional_bank_accounts FOR INSERT TO authenticated
WITH CHECK (professional_profile_id IN (
    SELECT id FROM public.professional_profiles WHERE user_profile_id IN (
        SELECT id FROM public.user_profiles WHERE auth_user_id = auth.uid()
    )
));

CREATE POLICY "Profissionais podem atualizar sua conta bancaria"
ON public.professional_bank_accounts FOR UPDATE TO authenticated
USING (professional_profile_id IN (
    SELECT id FROM public.professional_profiles WHERE user_profile_id IN (
        SELECT id FROM public.user_profiles WHERE auth_user_id = auth.uid()
    )
));
