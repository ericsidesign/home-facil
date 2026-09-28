CREATE TABLE IF NOT EXISTS public.payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_profile_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'REJECTED')),
  
  -- Salvamos um 'retrato' da chave pix no momento do saque por segurança e auditoria
  pix_key TEXT NOT NULL, 
  pix_key_type TEXT NOT NULL,
  
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  admin_notes TEXT, -- Se você rejeitar o saque por algum motivo, pode escrever aqui
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

-- Profissionais só podem ver os próprios pedidos de saque
CREATE POLICY "Profissionais podem ver seus saques"
ON public.payout_requests FOR SELECT TO authenticated
USING (professional_profile_id IN (
    SELECT id FROM public.professional_profiles WHERE user_profile_id IN (
        SELECT id FROM public.user_profiles WHERE auth_user_id = auth.uid()
    )
));

-- Profissionais podem solicitar saques
CREATE POLICY "Profissionais podem solicitar saques"
ON public.payout_requests FOR INSERT TO authenticated
WITH CHECK (professional_profile_id IN (
    SELECT id FROM public.professional_profiles WHERE user_profile_id IN (
        SELECT id FROM public.user_profiles WHERE auth_user_id = auth.uid()
    )
));
