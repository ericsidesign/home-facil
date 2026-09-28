-- ============================================================================
-- Home Fácil — Migration 004: Reviews Table
-- Adiciona a tabela de avaliações (reviews) para profissionais
-- ============================================================================

CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_profile_id UUID NOT NULL REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
  professional_profile_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  overall_rating SMALLINT NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  quality_rating SMALLINT CHECK (quality_rating BETWEEN 1 AND 5),
  punctuality_rating SMALLINT CHECK (punctuality_rating BETWEEN 1 AND 5),
  care_rating SMALLINT CHECK (care_rating BETWEEN 1 AND 5),
  communication_rating SMALLINT CHECK (communication_rating BETWEEN 1 AND 5),
  comment TEXT,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  moderation_status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (moderation_status IN ('ACTIVE','HIDDEN','FLAGGED')),
  moderation_reason TEXT,
  moderated_by UUID REFERENCES public.user_profiles(id),
  moderated_at TIMESTAMPTZ,
  original_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_reviews_professional ON public.reviews (professional_profile_id);
CREATE INDEX idx_reviews_customer ON public.reviews (customer_profile_id);
CREATE INDEX idx_reviews_booking ON public.reviews (booking_id);

-- Trigger para updated_at
CREATE TRIGGER trg_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Trigger para atualizar média de avaliações no perfil do profissional
CREATE OR REPLACE FUNCTION update_professional_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualiza count e media
  UPDATE public.professional_profiles
  SET 
    rating_count = (
      SELECT COUNT(*) FROM public.reviews 
      WHERE professional_profile_id = NEW.professional_profile_id 
      AND is_visible = true AND moderation_status = 'ACTIVE'
    ),
    rating_average = (
      SELECT COALESCE(ROUND(AVG(overall_rating)::numeric, 2), 0.00) FROM public.reviews 
      WHERE professional_profile_id = NEW.professional_profile_id 
      AND is_visible = true AND moderation_status = 'ACTIVE'
    )
  WHERE id = NEW.professional_profile_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_professional_rating
  AFTER INSERT OR UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION update_professional_rating();

-- RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews viewable by everyone" 
  ON public.reviews FOR SELECT 
  USING (is_visible = true AND moderation_status = 'ACTIVE');

CREATE POLICY "Customers can insert their own reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (
    customer_profile_id IN (
      SELECT cp.id 
      FROM public.customer_profiles cp
      JOIN public.user_profiles up ON cp.user_profile_id = up.id
      WHERE up.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Customers can view their own reviews even if hidden"
  ON public.reviews FOR SELECT
  USING (
    customer_profile_id IN (
      SELECT cp.id 
      FROM public.customer_profiles cp
      JOIN public.user_profiles up ON cp.user_profile_id = up.id
      WHERE up.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Professionals can view their own reviews"
  ON public.reviews FOR SELECT
  USING (
    professional_profile_id IN (
      SELECT pp.id 
      FROM public.professional_profiles pp
      JOIN public.user_profiles up ON pp.user_profile_id = up.id
      WHERE up.auth_user_id = auth.uid()
    )
  );
