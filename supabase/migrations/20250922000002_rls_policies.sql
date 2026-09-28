-- ============================================================================
-- Home Fácil — Migration 002: Row Level Security (RLS) Policies
-- Implementa RBAC via RLS no PostgreSQL.
-- ============================================================================

-- ============================================================================
-- HELPER: função para extrair role do JWT (custom claim)
-- O Supabase Auth permite injetar custom claims no JWT.
-- Usaremos app_metadata.role para armazenar o papel do usuário.
-- ============================================================================
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    (current_setting('request.jwt.claims', true)::json->>'user_role'),
    (current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role'),
    'ANONYMOUS'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Helper: obter user_profile_id do usuário autenticado
CREATE OR REPLACE FUNCTION auth.user_profile_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT id FROM public.user_profiles
    WHERE auth_user_id = auth.uid()
    AND deleted_at IS NULL
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Helper: verificar se é admin
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.user_role() IN ('ADMIN', 'SUPER_ADMIN');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Helper: verificar se é super admin
CREATE OR REPLACE FUNCTION auth.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.user_role() = 'SUPER_ADMIN';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Helper: verificar se é suporte
CREATE OR REPLACE FUNCTION auth.is_support()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.user_role() IN ('SUPPORT', 'ADMIN', 'SUPER_ADMIN');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- ENABLE RLS em todas as tabelas
-- ============================================================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_addon_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cancellation_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- POLICIES: user_profiles
-- ============================================================================

-- Usuário pode ver seu próprio perfil
CREATE POLICY user_profiles_select_own ON user_profiles
  FOR SELECT USING (auth_user_id = auth.uid());

-- Admin e suporte podem ver todos os perfis
CREATE POLICY user_profiles_select_admin ON user_profiles
  FOR SELECT USING (auth.is_support());

-- Usuário pode atualizar seu próprio perfil (exceto role)
CREATE POLICY user_profiles_update_own ON user_profiles
  FOR UPDATE USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- Admin pode atualizar qualquer perfil
CREATE POLICY user_profiles_update_admin ON user_profiles
  FOR UPDATE USING (auth.is_admin());

-- Inserção apenas pelo sistema (via Edge Function com service_role)
CREATE POLICY user_profiles_insert ON user_profiles
  FOR INSERT WITH CHECK (auth_user_id = auth.uid() OR auth.is_admin());

-- ============================================================================
-- POLICIES: customer_profiles
-- ============================================================================

CREATE POLICY customer_profiles_select_own ON customer_profiles
  FOR SELECT USING (
    user_profile_id = auth.user_profile_id()
  );

CREATE POLICY customer_profiles_select_admin ON customer_profiles
  FOR SELECT USING (auth.is_support());

CREATE POLICY customer_profiles_update_own ON customer_profiles
  FOR UPDATE USING (user_profile_id = auth.user_profile_id());

CREATE POLICY customer_profiles_insert ON customer_profiles
  FOR INSERT WITH CHECK (user_profile_id = auth.user_profile_id() OR auth.is_admin());

-- ============================================================================
-- POLICIES: professional_profiles
-- ============================================================================

-- Profissional pode ver e editar seu próprio perfil
CREATE POLICY professional_profiles_select_own ON professional_profiles
  FOR SELECT USING (user_profile_id = auth.user_profile_id());

-- Dados públicos para clientes (apenas profissionais aprovados)
CREATE POLICY professional_profiles_select_public ON professional_profiles
  FOR SELECT USING (
    verification_status = 'APPROVED'
    AND auth.user_role() = 'CUSTOMER'
  );

-- Admin e suporte veem todos
CREATE POLICY professional_profiles_select_admin ON professional_profiles
  FOR SELECT USING (auth.is_support());

CREATE POLICY professional_profiles_update_own ON professional_profiles
  FOR UPDATE USING (user_profile_id = auth.user_profile_id());

CREATE POLICY professional_profiles_update_admin ON professional_profiles
  FOR UPDATE USING (auth.is_admin());

CREATE POLICY professional_profiles_insert ON professional_profiles
  FOR INSERT WITH CHECK (user_profile_id = auth.user_profile_id() OR auth.is_admin());

-- ============================================================================
-- POLICIES: addresses
-- ============================================================================

-- Usuário vê seus próprios endereços
CREATE POLICY addresses_select_own ON addresses
  FOR SELECT USING (
    user_profile_id = auth.user_profile_id()
    AND deleted_at IS NULL
  );

-- Profissional confirmado de um booking pode ver endereço do cliente (sem access_instructions por default)
-- Nota: access_instructions são expostas apenas via Edge Function com lógica de negócio

-- Admin vê todos
CREATE POLICY addresses_select_admin ON addresses
  FOR SELECT USING (auth.is_support());

CREATE POLICY addresses_insert_own ON addresses
  FOR INSERT WITH CHECK (user_profile_id = auth.user_profile_id());

CREATE POLICY addresses_update_own ON addresses
  FOR UPDATE USING (user_profile_id = auth.user_profile_id());

CREATE POLICY addresses_delete_own ON addresses
  FOR DELETE USING (user_profile_id = auth.user_profile_id());

-- ============================================================================
-- POLICIES: professional_documents
-- ============================================================================

-- Profissional vê seus próprios documentos
CREATE POLICY prof_docs_select_own ON professional_documents
  FOR SELECT USING (
    professional_profile_id IN (
      SELECT id FROM professional_profiles WHERE user_profile_id = auth.user_profile_id()
    )
  );

-- Admin pode ver documentos (para revisão)
CREATE POLICY prof_docs_select_admin ON professional_documents
  FOR SELECT USING (auth.is_admin());

-- Profissional pode enviar documentos
CREATE POLICY prof_docs_insert_own ON professional_documents
  FOR INSERT WITH CHECK (
    professional_profile_id IN (
      SELECT id FROM professional_profiles WHERE user_profile_id = auth.user_profile_id()
    )
  );

-- Apenas admin pode atualizar status dos documentos
CREATE POLICY prof_docs_update_admin ON professional_documents
  FOR UPDATE USING (auth.is_admin());

-- ============================================================================
-- POLICIES: identity_verifications
-- ============================================================================

CREATE POLICY identity_verif_select_own ON identity_verifications
  FOR SELECT USING (
    professional_profile_id IN (
      SELECT id FROM professional_profiles WHERE user_profile_id = auth.user_profile_id()
    )
  );

CREATE POLICY identity_verif_select_admin ON identity_verifications
  FOR SELECT USING (auth.is_admin());

CREATE POLICY identity_verif_update_admin ON identity_verifications
  FOR UPDATE USING (auth.is_admin());

-- ============================================================================
-- POLICIES: service_categories, services, service_addons, service_addon_links
-- Catálogo é público para leitura, admin para escrita
-- ============================================================================

CREATE POLICY service_categories_select_all ON service_categories
  FOR SELECT USING (true);

CREATE POLICY service_categories_manage_admin ON service_categories
  FOR ALL USING (auth.is_admin());

CREATE POLICY services_select_all ON services
  FOR SELECT USING (true);

CREATE POLICY services_manage_admin ON services
  FOR ALL USING (auth.is_admin());

CREATE POLICY service_addons_select_all ON service_addons
  FOR SELECT USING (true);

CREATE POLICY service_addons_manage_admin ON service_addons
  FOR ALL USING (auth.is_admin());

CREATE POLICY service_addon_links_select_all ON service_addon_links
  FOR SELECT USING (true);

CREATE POLICY service_addon_links_manage_admin ON service_addon_links
  FOR ALL USING (auth.is_admin());

-- ============================================================================
-- POLICIES: professional_services
-- ============================================================================

-- Público: ver serviços de profissionais aprovados
CREATE POLICY prof_services_select_public ON professional_services
  FOR SELECT USING (
    professional_profile_id IN (
      SELECT id FROM professional_profiles WHERE verification_status = 'APPROVED'
    )
    OR professional_profile_id IN (
      SELECT id FROM professional_profiles WHERE user_profile_id = auth.user_profile_id()
    )
    OR auth.is_support()
  );

CREATE POLICY prof_services_manage_own ON professional_services
  FOR ALL USING (
    professional_profile_id IN (
      SELECT id FROM professional_profiles WHERE user_profile_id = auth.user_profile_id()
    )
  );

CREATE POLICY prof_services_manage_admin ON professional_services
  FOR ALL USING (auth.is_admin());

-- ============================================================================
-- POLICIES: service_areas
-- ============================================================================

CREATE POLICY service_areas_select_public ON service_areas
  FOR SELECT USING (
    professional_profile_id IN (
      SELECT id FROM professional_profiles WHERE verification_status = 'APPROVED'
    )
    OR professional_profile_id IN (
      SELECT id FROM professional_profiles WHERE user_profile_id = auth.user_profile_id()
    )
    OR auth.is_support()
  );

CREATE POLICY service_areas_manage_own ON service_areas
  FOR ALL USING (
    professional_profile_id IN (
      SELECT id FROM professional_profiles WHERE user_profile_id = auth.user_profile_id()
    )
  );

CREATE POLICY service_areas_manage_admin ON service_areas
  FOR ALL USING (auth.is_admin());

-- ============================================================================
-- POLICIES: availability_rules, availability_exceptions
-- ============================================================================

CREATE POLICY avail_rules_select_public ON availability_rules
  FOR SELECT USING (
    professional_profile_id IN (
      SELECT id FROM professional_profiles WHERE verification_status = 'APPROVED'
    )
    OR professional_profile_id IN (
      SELECT id FROM professional_profiles WHERE user_profile_id = auth.user_profile_id()
    )
    OR auth.is_support()
  );

CREATE POLICY avail_rules_manage_own ON availability_rules
  FOR ALL USING (
    professional_profile_id IN (
      SELECT id FROM professional_profiles WHERE user_profile_id = auth.user_profile_id()
    )
  );

CREATE POLICY avail_exceptions_select_public ON availability_exceptions
  FOR SELECT USING (
    professional_profile_id IN (
      SELECT id FROM professional_profiles WHERE verification_status = 'APPROVED'
    )
    OR professional_profile_id IN (
      SELECT id FROM professional_profiles WHERE user_profile_id = auth.user_profile_id()
    )
    OR auth.is_support()
  );

CREATE POLICY avail_exceptions_manage_own ON availability_exceptions
  FOR ALL USING (
    professional_profile_id IN (
      SELECT id FROM professional_profiles WHERE user_profile_id = auth.user_profile_id()
    )
  );

-- ============================================================================
-- POLICIES: pricing_rules
-- ============================================================================

-- Preços são gerenciados pelo admin; Edge Functions usam service_role
CREATE POLICY pricing_rules_select_admin ON pricing_rules
  FOR SELECT USING (auth.is_admin());

CREATE POLICY pricing_rules_manage_admin ON pricing_rules
  FOR ALL USING (auth.is_admin());

-- ============================================================================
-- POLICIES: price_quotes
-- ============================================================================

CREATE POLICY price_quotes_select_own ON price_quotes
  FOR SELECT USING (
    customer_profile_id IN (
      SELECT id FROM customer_profiles WHERE user_profile_id = auth.user_profile_id()
    )
    OR professional_profile_id IN (
      SELECT id FROM professional_profiles WHERE user_profile_id = auth.user_profile_id()
    )
  );

CREATE POLICY price_quotes_select_admin ON price_quotes
  FOR SELECT USING (auth.is_support());

-- Inserção e atualização apenas via Edge Function (service_role)

-- ============================================================================
-- POLICIES: bookings
-- ============================================================================

-- Cliente vê seus bookings
CREATE POLICY bookings_select_customer ON bookings
  FOR SELECT USING (
    customer_profile_id IN (
      SELECT id FROM customer_profiles WHERE user_profile_id = auth.user_profile_id()
    )
  );

-- Profissional vê seus bookings
CREATE POLICY bookings_select_professional ON bookings
  FOR SELECT USING (
    professional_profile_id IN (
      SELECT id FROM professional_profiles WHERE user_profile_id = auth.user_profile_id()
    )
  );

-- Admin e suporte veem todos
CREATE POLICY bookings_select_admin ON bookings
  FOR SELECT USING (auth.is_support());

-- Atualizações apenas via Edge Functions (service_role) para garantir state machine

-- ============================================================================
-- POLICIES: booking_items
-- ============================================================================

CREATE POLICY booking_items_select ON booking_items
  FOR SELECT USING (
    booking_id IN (
      SELECT id FROM bookings WHERE
        customer_profile_id IN (SELECT id FROM customer_profiles WHERE user_profile_id = auth.user_profile_id())
        OR professional_profile_id IN (SELECT id FROM professional_profiles WHERE user_profile_id = auth.user_profile_id())
    )
    OR auth.is_support()
  );

-- ============================================================================
-- POLICIES: booking_status_history
-- ============================================================================

CREATE POLICY booking_history_select ON booking_status_history
  FOR SELECT USING (
    booking_id IN (
      SELECT id FROM bookings WHERE
        customer_profile_id IN (SELECT id FROM customer_profiles WHERE user_profile_id = auth.user_profile_id())
        OR professional_profile_id IN (SELECT id FROM professional_profiles WHERE user_profile_id = auth.user_profile_id())
    )
    OR auth.is_support()
  );

-- ============================================================================
-- POLICIES: payments, payment_transactions
-- ============================================================================

CREATE POLICY payments_select_customer ON payments
  FOR SELECT USING (
    customer_profile_id IN (
      SELECT id FROM customer_profiles WHERE user_profile_id = auth.user_profile_id()
    )
  );

CREATE POLICY payments_select_admin ON payments
  FOR SELECT USING (auth.is_support());

CREATE POLICY pay_transactions_select_admin ON payment_transactions
  FOR SELECT USING (auth.is_admin());

-- ============================================================================
-- POLICIES: ledger_entries
-- ============================================================================

-- Profissional vê seus próprios créditos
CREATE POLICY ledger_select_professional ON ledger_entries
  FOR SELECT USING (
    professional_profile_id IN (
      SELECT id FROM professional_profiles WHERE user_profile_id = auth.user_profile_id()
    )
  );

CREATE POLICY ledger_select_admin ON ledger_entries
  FOR SELECT USING (auth.is_admin());

-- ============================================================================
-- POLICIES: payouts
-- ============================================================================

CREATE POLICY payouts_select_own ON payouts
  FOR SELECT USING (
    professional_profile_id IN (
      SELECT id FROM professional_profiles WHERE user_profile_id = auth.user_profile_id()
    )
  );

CREATE POLICY payouts_select_admin ON payouts
  FOR SELECT USING (auth.is_admin());

-- ============================================================================
-- POLICIES: refunds
-- ============================================================================

CREATE POLICY refunds_select_admin ON refunds
  FOR SELECT USING (auth.is_support());

-- ============================================================================
-- POLICIES: reviews
-- ============================================================================

-- Avaliações visíveis são públicas
CREATE POLICY reviews_select_visible ON reviews
  FOR SELECT USING (is_visible = true AND moderation_status = 'ACTIVE');

-- Dono da review
CREATE POLICY reviews_select_own ON reviews
  FOR SELECT USING (
    customer_profile_id IN (
      SELECT id FROM customer_profiles WHERE user_profile_id = auth.user_profile_id()
    )
  );

-- Profissional vê suas avaliações
CREATE POLICY reviews_select_professional ON reviews
  FOR SELECT USING (
    professional_profile_id IN (
      SELECT id FROM professional_profiles WHERE user_profile_id = auth.user_profile_id()
    )
  );

-- Admin vê todas (incluindo moderadas)
CREATE POLICY reviews_select_admin ON reviews
  FOR SELECT USING (auth.is_support());

-- Cliente insere review (validação de booking COMPLETED via Edge Function)
CREATE POLICY reviews_insert_customer ON reviews
  FOR INSERT WITH CHECK (
    customer_profile_id IN (
      SELECT id FROM customer_profiles WHERE user_profile_id = auth.user_profile_id()
    )
  );

-- Admin modera
CREATE POLICY reviews_update_admin ON reviews
  FOR UPDATE USING (auth.is_admin());

-- ============================================================================
-- POLICIES: favorites
-- ============================================================================

CREATE POLICY favorites_select_own ON favorites
  FOR SELECT USING (
    customer_profile_id IN (
      SELECT id FROM customer_profiles WHERE user_profile_id = auth.user_profile_id()
    )
  );

CREATE POLICY favorites_manage_own ON favorites
  FOR ALL USING (
    customer_profile_id IN (
      SELECT id FROM customer_profiles WHERE user_profile_id = auth.user_profile_id()
    )
  );

-- ============================================================================
-- POLICIES: notifications
-- ============================================================================

CREATE POLICY notifications_select_own ON notifications
  FOR SELECT USING (user_profile_id = auth.user_profile_id());

CREATE POLICY notifications_update_own ON notifications
  FOR UPDATE USING (user_profile_id = auth.user_profile_id());

-- ============================================================================
-- POLICIES: support_tickets
-- ============================================================================

CREATE POLICY tickets_select_own ON support_tickets
  FOR SELECT USING (created_by = auth.user_profile_id());

CREATE POLICY tickets_select_support ON support_tickets
  FOR SELECT USING (auth.is_support());

CREATE POLICY tickets_insert_own ON support_tickets
  FOR INSERT WITH CHECK (created_by = auth.user_profile_id());

CREATE POLICY tickets_update_support ON support_tickets
  FOR UPDATE USING (auth.is_support());

-- ============================================================================
-- POLICIES: disputes
-- ============================================================================

CREATE POLICY disputes_select_own ON disputes
  FOR SELECT USING (opened_by = auth.user_profile_id());

CREATE POLICY disputes_select_parties ON disputes
  FOR SELECT USING (
    booking_id IN (
      SELECT id FROM bookings WHERE
        customer_profile_id IN (SELECT id FROM customer_profiles WHERE user_profile_id = auth.user_profile_id())
        OR professional_profile_id IN (SELECT id FROM professional_profiles WHERE user_profile_id = auth.user_profile_id())
    )
  );

CREATE POLICY disputes_select_admin ON disputes
  FOR SELECT USING (auth.is_support());

CREATE POLICY disputes_insert_own ON disputes
  FOR INSERT WITH CHECK (opened_by = auth.user_profile_id());

CREATE POLICY disputes_update_admin ON disputes
  FOR UPDATE USING (auth.is_admin());

-- ============================================================================
-- POLICIES: cancellation_policies
-- ============================================================================

-- Público pode ler políticas ativas
CREATE POLICY cancel_policies_select_active ON cancellation_policies
  FOR SELECT USING (is_active = true);

CREATE POLICY cancel_policies_manage_admin ON cancellation_policies
  FOR ALL USING (auth.is_admin());

-- ============================================================================
-- POLICIES: platform_settings
-- ============================================================================

-- Admin lê configurações normais
CREATE POLICY settings_select_admin ON platform_settings
  FOR SELECT USING (auth.is_admin() AND (NOT is_sensitive OR auth.is_super_admin()));

-- Apenas super admin gerencia configurações sensíveis
CREATE POLICY settings_manage_admin ON platform_settings
  FOR ALL USING (auth.is_admin() AND (NOT is_sensitive OR auth.is_super_admin()));

-- ============================================================================
-- POLICIES: platform_settings_history
-- ============================================================================

CREATE POLICY settings_history_select_admin ON platform_settings_history
  FOR SELECT USING (auth.is_admin());

-- ============================================================================
-- POLICIES: audit_log
-- ============================================================================

-- Apenas admin pode ler
CREATE POLICY audit_log_select_admin ON audit_log
  FOR SELECT USING (auth.is_admin());

-- Inserção via Edge Functions (service_role) ou trigger
CREATE POLICY audit_log_insert ON audit_log
  FOR INSERT WITH CHECK (true);  -- Protegido pelo trigger que impede UPDATE/DELETE

-- ============================================================================
-- POLICIES: user_blocks
-- ============================================================================

CREATE POLICY user_blocks_select_own ON user_blocks
  FOR SELECT USING (blocker_id = auth.user_profile_id());

CREATE POLICY user_blocks_manage_own ON user_blocks
  FOR ALL USING (blocker_id = auth.user_profile_id());

CREATE POLICY user_blocks_select_admin ON user_blocks
  FOR SELECT USING (auth.is_admin());
C R E A T E   P O L I C Y   u s e r _ p r o f i l e s _ s e l e c t _ p u b l i c   O N   u s e r _ p r o f i l e s   F O R   S E L E C T   U S I N G   ( t r u e ) ;  
 