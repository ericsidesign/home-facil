-- ============================================================================
-- Home Fácil — Migration 001: Foundation
-- Cria todas as tabelas do MVP com constraints, índices e triggers.
-- ============================================================================

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";    -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";     -- busca por similaridade (futuro)

-- ============================================================================
-- HELPER: updated_at trigger function
-- ============================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 1. user_profiles
-- ============================================================================
CREATE TABLE user_profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id  UUID NOT NULL UNIQUE,
  role          TEXT NOT NULL CHECK (role IN ('CUSTOMER','PROFESSIONAL','SUPPORT','ADMIN','SUPER_ADMIN')),
  full_name     TEXT NOT NULL,
  display_name  TEXT,
  avatar_url    TEXT,
  phone_verified BOOLEAN NOT NULL DEFAULT false,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_user_profiles_auth_user_id ON user_profiles (auth_user_id);
CREATE INDEX idx_user_profiles_role ON user_profiles (role);
CREATE INDEX idx_user_profiles_active ON user_profiles (is_active) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 2. customer_profiles
-- ============================================================================
CREATE TABLE customer_profiles (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id          UUID NOT NULL UNIQUE REFERENCES user_profiles(id) ON DELETE CASCADE,
  cpf_hash                 TEXT,
  cpf_last_four            TEXT CHECK (cpf_last_four IS NULL OR length(cpf_last_four) = 4),
  preferred_contact_method TEXT DEFAULT 'app',
  notes                    TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customer_profiles_user_profile_id ON customer_profiles (user_profile_id);

CREATE TRIGGER trg_customer_profiles_updated_at
  BEFORE UPDATE ON customer_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 3. professional_profiles
-- ============================================================================
CREATE TABLE professional_profiles (
  id                             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id                UUID NOT NULL UNIQUE REFERENCES user_profiles(id) ON DELETE CASCADE,
  cpf_encrypted                  TEXT,
  cpf_last_four                  TEXT CHECK (cpf_last_four IS NULL OR length(cpf_last_four) = 4),
  date_of_birth                  DATE,
  bio                            TEXT,
  experience_description         TEXT,
  experience_years               SMALLINT CHECK (experience_years IS NULL OR experience_years >= 0),
  verification_status            TEXT NOT NULL DEFAULT 'DRAFT'
                                   CHECK (verification_status IN (
                                     'DRAFT','PENDING_VERIFICATION','UNDER_REVIEW',
                                     'APPROVED','REJECTED','SUSPENDED','BLOCKED'
                                   )),
  verification_status_reason     TEXT,
  verification_status_changed_at TIMESTAMPTZ,
  verification_status_changed_by UUID REFERENCES user_profiles(id),
  materials_provided             BOOLEAN NOT NULL DEFAULT false,
  rating_average                 NUMERIC(3,2) DEFAULT 0.00,
  rating_count                   INTEGER NOT NULL DEFAULT 0,
  completed_bookings_count       INTEGER NOT NULL DEFAULT 0,
  is_available                   BOOLEAN NOT NULL DEFAULT true,
  payout_method                  TEXT,
  payout_details_encrypted       TEXT,
  created_at                     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_professional_profiles_user_profile_id ON professional_profiles (user_profile_id);
CREATE INDEX idx_professional_profiles_verification_status ON professional_profiles (verification_status);
CREATE INDEX idx_professional_profiles_rating ON professional_profiles (rating_average DESC, rating_count DESC);
CREATE INDEX idx_professional_profiles_available ON professional_profiles (is_available)
  WHERE verification_status = 'APPROVED' AND is_available = true;

CREATE TRIGGER trg_professional_profiles_updated_at
  BEFORE UPDATE ON professional_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 4. addresses
-- ============================================================================
CREATE TABLE addresses (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id        UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  label                  TEXT DEFAULT 'Casa',
  zip_code               TEXT NOT NULL,
  street                 TEXT NOT NULL,
  number                 TEXT NOT NULL,
  complement             TEXT,
  neighborhood           TEXT NOT NULL,
  city                   TEXT NOT NULL,
  state                  TEXT NOT NULL CHECK (length(state) = 2),
  reference              TEXT,
  latitude               NUMERIC(10,7),
  longitude              NUMERIC(10,7),
  is_primary             BOOLEAN NOT NULL DEFAULT false,
  is_private             BOOLEAN NOT NULL DEFAULT false,
  access_instructions    TEXT,  -- proteção reforçada: acesso restrito
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at             TIMESTAMPTZ
);

CREATE INDEX idx_addresses_user_profile_id ON addresses (user_profile_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_addresses_city_state ON addresses (state, city) WHERE deleted_at IS NULL;
CREATE INDEX idx_addresses_coordinates ON addresses (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND deleted_at IS NULL;

CREATE TRIGGER trg_addresses_updated_at
  BEFORE UPDATE ON addresses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 5. professional_documents
-- ============================================================================
CREATE TABLE professional_documents (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_profile_id  UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  document_type            TEXT NOT NULL CHECK (document_type IN ('CPF','RG','CNH','SELFIE','PROOF_OF_ADDRESS','OTHER')),
  storage_path             TEXT NOT NULL,
  file_name                TEXT NOT NULL,
  mime_type                TEXT NOT NULL,
  file_size_bytes          INTEGER,
  status                   TEXT NOT NULL DEFAULT 'PENDING'
                             CHECK (status IN ('PENDING','APPROVED','REJECTED','EXPIRED')),
  review_notes             TEXT,
  reviewed_by              UUID REFERENCES user_profiles(id),
  reviewed_at              TIMESTAMPTZ,
  expires_at               TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_prof_docs_professional_id ON professional_documents (professional_profile_id);
CREATE INDEX idx_prof_docs_status ON professional_documents (status);

CREATE TRIGGER trg_professional_documents_updated_at
  BEFORE UPDATE ON professional_documents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 6. identity_verifications
-- ============================================================================
CREATE TABLE identity_verifications (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_profile_id  UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  provider                 TEXT NOT NULL DEFAULT 'MANUAL',
  provider_reference       TEXT,
  status                   TEXT NOT NULL DEFAULT 'PENDING'
                             CHECK (status IN ('PENDING','IN_PROGRESS','APPROVED','REJECTED','EXPIRED','ERROR')),
  rejection_reason         TEXT,
  reviewed_by              UUID REFERENCES user_profiles(id),
  reviewed_at              TIMESTAMPTZ,
  provider_response        JSONB,
  attempt_number           SMALLINT NOT NULL DEFAULT 1,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_identity_verif_professional_id ON identity_verifications (professional_profile_id);
CREATE INDEX idx_identity_verif_status ON identity_verifications (status);

CREATE TRIGGER trg_identity_verifications_updated_at
  BEFORE UPDATE ON identity_verifications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 7. service_categories
-- ============================================================================
CREATE TABLE service_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  icon_url    TEXT,
  sort_order  SMALLINT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_service_categories_updated_at
  BEFORE UPDATE ON service_categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 8. services
-- ============================================================================
CREATE TABLE services (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id                 UUID NOT NULL REFERENCES service_categories(id) ON DELETE RESTRICT,
  name                        TEXT NOT NULL,
  slug                        TEXT NOT NULL UNIQUE,
  description                 TEXT,
  included_items              JSONB NOT NULL DEFAULT '[]',
  excluded_items              JSONB NOT NULL DEFAULT '[]',
  estimated_duration_minutes  INTEGER NOT NULL,
  max_area_sqm                INTEGER,
  photo_urls                  JSONB DEFAULT '[]',
  client_instructions         TEXT,
  materials_rules             TEXT,
  is_active                   BOOLEAN NOT NULL DEFAULT true,
  sort_order                  SMALLINT NOT NULL DEFAULT 0,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_services_category_id ON services (category_id);
CREATE INDEX idx_services_slug ON services (slug);
CREATE INDEX idx_services_active ON services (is_active) WHERE is_active = true;

CREATE TRIGGER trg_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 9. service_addons
-- ============================================================================
CREATE TABLE service_addons (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                        TEXT NOT NULL,
  slug                        TEXT NOT NULL UNIQUE,
  description                 TEXT,
  estimated_duration_minutes  INTEGER NOT NULL DEFAULT 0,
  is_active                   BOOLEAN NOT NULL DEFAULT true,
  sort_order                  SMALLINT NOT NULL DEFAULT 0,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_service_addons_updated_at
  BEFORE UPDATE ON service_addons
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 10. service_addon_links
-- ============================================================================
CREATE TABLE service_addon_links (
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  addon_id   UUID NOT NULL REFERENCES service_addons(id) ON DELETE CASCADE,
  is_default BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (service_id, addon_id)
);

-- ============================================================================
-- 11. professional_services
-- ============================================================================
CREATE TABLE professional_services (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_profile_id  UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  service_id               UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  is_active                BOOLEAN NOT NULL DEFAULT true,
  custom_price_cents       INTEGER CHECK (custom_price_cents IS NULL OR custom_price_cents >= 0),
  custom_duration_minutes  INTEGER CHECK (custom_duration_minutes IS NULL OR custom_duration_minutes > 0),
  notes                    TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (professional_profile_id, service_id)
);

CREATE INDEX idx_prof_services_professional_id ON professional_services (professional_profile_id);
CREATE INDEX idx_prof_services_service_id ON professional_services (service_id);

CREATE TRIGGER trg_professional_services_updated_at
  BEFORE UPDATE ON professional_services
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 12. service_areas
-- ============================================================================
CREATE TABLE service_areas (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_profile_id  UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  city                     TEXT NOT NULL,
  state                    TEXT NOT NULL CHECK (length(state) = 2),
  neighborhoods            JSONB DEFAULT '[]',
  max_distance_km          NUMERIC(6,2),
  is_active                BOOLEAN NOT NULL DEFAULT true,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_service_areas_professional_id ON service_areas (professional_profile_id);
CREATE INDEX idx_service_areas_city_state ON service_areas (state, city);

CREATE TRIGGER trg_service_areas_updated_at
  BEFORE UPDATE ON service_areas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 13. availability_rules
-- ============================================================================
CREATE TABLE availability_rules (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_profile_id  UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  day_of_week              SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time               TIME NOT NULL,
  end_time                 TIME NOT NULL,
  is_active                BOOLEAN NOT NULL DEFAULT true,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

CREATE INDEX idx_avail_rules_professional_id ON availability_rules (professional_profile_id);

CREATE TRIGGER trg_availability_rules_updated_at
  BEFORE UPDATE ON availability_rules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 14. availability_exceptions
-- ============================================================================
CREATE TABLE availability_exceptions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_profile_id  UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  exception_date           DATE NOT NULL,
  start_time               TIME,
  end_time                 TIME,
  reason                   TEXT,
  is_available             BOOLEAN NOT NULL DEFAULT false,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_avail_exceptions_professional_date ON availability_exceptions (professional_profile_id, exception_date);

-- ============================================================================
-- 15. pricing_rules
-- ============================================================================
CREATE TABLE pricing_rules (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id            UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  region_state          TEXT,
  region_city           TEXT,
  strategy              TEXT NOT NULL DEFAULT 'HYBRID'
                          CHECK (strategy IN ('PLATFORM_FIXED','PROFESSIONAL_DEFINED','HYBRID')),
  base_price_cents      INTEGER NOT NULL CHECK (base_price_cents >= 0),
  min_price_cents       INTEGER NOT NULL CHECK (min_price_cents >= 0),
  max_price_cents       INTEGER NOT NULL CHECK (max_price_cents > 0),
  area_bracket_rules    JSONB NOT NULL DEFAULT '[]',
  bedroom_price_cents   INTEGER NOT NULL DEFAULT 0,
  bathroom_price_cents  INTEGER NOT NULL DEFAULT 0,
  addon_prices          JSONB NOT NULL DEFAULT '{}',
  materials_fee_cents   INTEGER NOT NULL DEFAULT 0,
  time_multiplier_rules JSONB DEFAULT '{}',
  is_active             BOOLEAN NOT NULL DEFAULT true,
  effective_from        TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_until       TIMESTAMPTZ,
  version               INTEGER NOT NULL DEFAULT 1,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (max_price_cents >= min_price_cents),
  CHECK (base_price_cents >= min_price_cents AND base_price_cents <= max_price_cents)
);

CREATE INDEX idx_pricing_rules_service_region ON pricing_rules (service_id, region_state, region_city);
CREATE INDEX idx_pricing_rules_effective ON pricing_rules (effective_from, effective_until) WHERE is_active = true;

CREATE TRIGGER trg_pricing_rules_updated_at
  BEFORE UPDATE ON pricing_rules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 16. price_quotes
-- ============================================================================
CREATE TABLE price_quotes (
  id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_profile_id          UUID NOT NULL REFERENCES customer_profiles(id),
  professional_profile_id      UUID NOT NULL REFERENCES professional_profiles(id),
  service_id                   UUID NOT NULL REFERENCES services(id),
  pricing_rule_id              UUID NOT NULL REFERENCES pricing_rules(id),
  version                      INTEGER NOT NULL DEFAULT 1,
  status                       TEXT NOT NULL DEFAULT 'ACTIVE'
                                 CHECK (status IN ('ACTIVE','EXPIRED','USED','CANCELLED')),
  base_price_cents             INTEGER NOT NULL,
  area_adjustment_cents        INTEGER NOT NULL DEFAULT 0,
  bedroom_adjustment_cents     INTEGER NOT NULL DEFAULT 0,
  bathroom_adjustment_cents    INTEGER NOT NULL DEFAULT 0,
  addons_total_cents           INTEGER NOT NULL DEFAULT 0,
  materials_fee_cents          INTEGER NOT NULL DEFAULT 0,
  time_adjustment_cents        INTEGER NOT NULL DEFAULT 0,
  professional_adjustment_cents INTEGER NOT NULL DEFAULT 0,
  discount_cents               INTEGER NOT NULL DEFAULT 0,
  subtotal_cents               INTEGER NOT NULL,
  platform_fee_percentage      NUMERIC(5,2) NOT NULL,
  platform_fee_cents           INTEGER NOT NULL,
  total_cents                  INTEGER NOT NULL,
  professional_net_cents       INTEGER NOT NULL,
  currency                     TEXT NOT NULL DEFAULT 'BRL',
  components                   JSONB NOT NULL,
  property_details             JSONB NOT NULL,
  selected_addons              JSONB NOT NULL DEFAULT '[]',
  scheduled_date               DATE NOT NULL,
  scheduled_start_time         TIME NOT NULL,
  estimated_duration_minutes   INTEGER NOT NULL,
  expires_at                   TIMESTAMPTZ NOT NULL,
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_price_quotes_customer ON price_quotes (customer_profile_id);
CREATE INDEX idx_price_quotes_professional ON price_quotes (professional_profile_id);
CREATE INDEX idx_price_quotes_status_expires ON price_quotes (status, expires_at);

-- ============================================================================
-- 17. cancellation_policies
-- ============================================================================
CREATE TABLE cancellation_policies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  version         INTEGER NOT NULL DEFAULT 1,
  rules           JSONB NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  effective_from  TIMESTAMPTZ NOT NULL,
  effective_until TIMESTAMPTZ,
  created_by      UUID NOT NULL REFERENCES user_profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 18. bookings
-- ============================================================================
CREATE TABLE bookings (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number                TEXT NOT NULL UNIQUE,
  customer_profile_id           UUID NOT NULL REFERENCES customer_profiles(id),
  professional_profile_id       UUID NOT NULL REFERENCES professional_profiles(id),
  service_id                    UUID NOT NULL REFERENCES services(id),
  address_id                    UUID NOT NULL REFERENCES addresses(id),
  price_quote_id                UUID NOT NULL REFERENCES price_quotes(id),
  status                        TEXT NOT NULL DEFAULT 'DRAFT'
                                  CHECK (status IN (
                                    'DRAFT','REQUESTED','AWAITING_PROFESSIONAL','ACCEPTED',
                                    'PAYMENT_PENDING','CONFIRMED','PROFESSIONAL_ON_THE_WAY',
                                    'CHECKED_IN','IN_PROGRESS','CHECKED_OUT',
                                    'AWAITING_CUSTOMER_CONFIRMATION','COMPLETED',
                                    'CANCELLED','EXPIRED','DISPUTED','REFUND_PENDING','REFUNDED'
                                  )),
  scheduled_date                DATE NOT NULL,
  scheduled_start_time          TIME NOT NULL,
  estimated_duration_minutes    INTEGER NOT NULL,
  actual_start_time             TIMESTAMPTZ,
  actual_end_time               TIMESTAMPTZ,
  -- Propriedades do imóvel (snapshot)
  property_type                 TEXT NOT NULL,
  area_bracket                  TEXT NOT NULL,
  bedrooms                      SMALLINT NOT NULL,
  bathrooms                     SMALLINT NOT NULL,
  has_outdoor_area              BOOLEAN NOT NULL DEFAULT false,
  has_stairs                    BOOLEAN NOT NULL DEFAULT false,
  has_pets                      BOOLEAN NOT NULL DEFAULT false,
  pet_details                   TEXT,
  needs_parking                 BOOLEAN NOT NULL DEFAULT false,
  needs_condo_authorization     BOOLEAN NOT NULL DEFAULT false,
  client_present                BOOLEAN,
  access_instructions_encrypted TEXT,
  special_notes                 TEXT,
  materials_provided_by         TEXT NOT NULL CHECK (materials_provided_by IN ('CLIENT','PROFESSIONAL')),
  -- Snapshots imutáveis
  cancellation_policy_snapshot  JSONB NOT NULL,
  price_snapshot                JSONB NOT NULL,
  -- Valores financeiros
  gross_amount_cents            INTEGER NOT NULL,
  platform_fee_cents            INTEGER NOT NULL,
  professional_net_cents        INTEGER NOT NULL,
  tip_amount_cents              INTEGER NOT NULL DEFAULT 0,
  currency                      TEXT NOT NULL DEFAULT 'BRL',
  -- Fluxo
  professional_accepted_at      TIMESTAMPTZ,
  professional_rejection_reason TEXT,
  accept_expires_at             TIMESTAMPTZ,
  checked_in_at                 TIMESTAMPTZ,
  checked_out_at                TIMESTAMPTZ,
  completed_at                  TIMESTAMPTZ,
  cancelled_at                  TIMESTAMPTZ,
  cancelled_by                  UUID REFERENCES user_profiles(id),
  cancellation_reason           TEXT,
  auto_completed_at             TIMESTAMPTZ,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bookings_customer ON bookings (customer_profile_id);
CREATE INDEX idx_bookings_professional ON bookings (professional_profile_id);
CREATE INDEX idx_bookings_status ON bookings (status);
CREATE INDEX idx_bookings_scheduled_date ON bookings (scheduled_date);
CREATE INDEX idx_bookings_number ON bookings (booking_number);
-- Prevenir dupla reserva: no máximo um booking ativo por profissional+data+hora
CREATE INDEX idx_bookings_schedule_conflict ON bookings (professional_profile_id, scheduled_date, scheduled_start_time)
  WHERE status NOT IN ('CANCELLED','EXPIRED','REFUNDED');

CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 19. booking_items
-- ============================================================================
CREATE TABLE booking_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id        UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  addon_id          UUID REFERENCES service_addons(id),
  item_type         TEXT NOT NULL CHECK (item_type IN ('SERVICE','ADDON','MATERIALS_FEE')),
  name              TEXT NOT NULL,
  quantity          SMALLINT NOT NULL DEFAULT 1,
  unit_price_cents  INTEGER NOT NULL,
  total_price_cents INTEGER NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_booking_items_booking ON booking_items (booking_id);

-- ============================================================================
-- 20. booking_status_history
-- ============================================================================
CREATE TABLE booking_status_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  from_status     TEXT,
  to_status       TEXT NOT NULL,
  changed_by      UUID REFERENCES user_profiles(id),
  changed_by_role TEXT,
  reason          TEXT,
  metadata        JSONB DEFAULT '{}',
  ip_address      INET,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_booking_history_booking_id ON booking_status_history (booking_id);

-- ============================================================================
-- 21. payments
-- ============================================================================
CREATE TABLE payments (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id           UUID NOT NULL REFERENCES bookings(id),
  customer_profile_id  UUID NOT NULL REFERENCES customer_profiles(id),
  provider             TEXT NOT NULL,
  provider_payment_id  TEXT UNIQUE,
  idempotency_key      TEXT NOT NULL UNIQUE,
  status               TEXT NOT NULL DEFAULT 'PENDING'
                         CHECK (status IN (
                           'PENDING','PROCESSING','AUTHORIZED','CAPTURED',
                           'FAILED','CANCELLED','REFUND_PENDING',
                           'PARTIALLY_REFUNDED','REFUNDED'
                         )),
  method               TEXT,
  gross_amount_cents   INTEGER NOT NULL,
  currency             TEXT NOT NULL DEFAULT 'BRL',
  provider_fee_cents   INTEGER,
  metadata             JSONB DEFAULT '{}',
  paid_at              TIMESTAMPTZ,
  failed_at            TIMESTAMPTZ,
  failure_reason       TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_booking_id ON payments (booking_id);
CREATE INDEX idx_payments_provider_id ON payments (provider_payment_id);
CREATE INDEX idx_payments_status ON payments (status);
CREATE INDEX idx_payments_idempotency ON payments (idempotency_key);

CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 22. payment_transactions
-- ============================================================================
CREATE TABLE payment_transactions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id               UUID NOT NULL REFERENCES payments(id),
  type                     TEXT NOT NULL
                             CHECK (type IN ('AUTHORIZATION','CAPTURE','CANCELLATION','REFUND','CHARGEBACK','WEBHOOK')),
  provider_transaction_id  TEXT,
  idempotency_key          TEXT UNIQUE,
  status                   TEXT NOT NULL,
  amount_cents             INTEGER NOT NULL,
  provider_response        JSONB,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pay_transactions_payment_id ON payment_transactions (payment_id);
CREATE INDEX idx_pay_transactions_idempotency ON payment_transactions (idempotency_key);

-- ============================================================================
-- 23. ledger_entries
-- ============================================================================
CREATE TABLE ledger_entries (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id               UUID REFERENCES bookings(id),
  payment_id               UUID REFERENCES payments(id),
  payout_id                UUID,  -- FK adicionada após criar payouts
  entry_type               TEXT NOT NULL
                             CHECK (entry_type IN (
                               'BOOKING_PAYMENT','PLATFORM_FEE','PROCESSING_FEE',
                               'PROFESSIONAL_CREDIT','TIP_CREDIT','REFUND',
                               'CHARGEBACK','PAYOUT','ADJUSTMENT'
                             )),
  direction                TEXT NOT NULL CHECK (direction IN ('CREDIT','DEBIT')),
  amount_cents             INTEGER NOT NULL CHECK (amount_cents > 0),
  currency                 TEXT NOT NULL DEFAULT 'BRL',
  reference_type           TEXT,
  reference_id             TEXT,
  description              TEXT NOT NULL,
  professional_profile_id  UUID REFERENCES professional_profiles(id),
  idempotency_key          TEXT NOT NULL UNIQUE,
  metadata                 JSONB DEFAULT '{}',
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ledger_booking ON ledger_entries (booking_id);
CREATE INDEX idx_ledger_professional ON ledger_entries (professional_profile_id);
CREATE INDEX idx_ledger_type ON ledger_entries (entry_type);
CREATE INDEX idx_ledger_idempotency ON ledger_entries (idempotency_key);

-- ============================================================================
-- 24. payouts
-- ============================================================================
CREATE TABLE payouts (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_profile_id  UUID NOT NULL REFERENCES professional_profiles(id),
  provider                 TEXT NOT NULL,
  provider_payout_id       TEXT UNIQUE,
  idempotency_key          TEXT NOT NULL UNIQUE,
  status                   TEXT NOT NULL DEFAULT 'PENDING'
                             CHECK (status IN ('PENDING','PROCESSING','COMPLETED','FAILED','CANCELLED')),
  amount_cents             INTEGER NOT NULL CHECK (amount_cents > 0),
  currency                 TEXT NOT NULL DEFAULT 'BRL',
  period_start             DATE,
  period_end               DATE,
  booking_ids              UUID[],
  failure_reason           TEXT,
  paid_at                  TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payouts_professional ON payouts (professional_profile_id);
CREATE INDEX idx_payouts_status ON payouts (status);
CREATE INDEX idx_payouts_idempotency ON payouts (idempotency_key);

CREATE TRIGGER trg_payouts_updated_at
  BEFORE UPDATE ON payouts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Adicionar FK de ledger para payouts agora que a tabela existe
ALTER TABLE ledger_entries
  ADD CONSTRAINT fk_ledger_payout
  FOREIGN KEY (payout_id) REFERENCES payouts(id);

-- ============================================================================
-- 25. refunds
-- ============================================================================
CREATE TABLE refunds (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id          UUID NOT NULL REFERENCES payments(id),
  booking_id          UUID NOT NULL REFERENCES bookings(id),
  idempotency_key     TEXT NOT NULL UNIQUE,
  type                TEXT NOT NULL CHECK (type IN ('FULL','PARTIAL')),
  reason              TEXT NOT NULL,
  amount_cents        INTEGER NOT NULL CHECK (amount_cents > 0),
  currency            TEXT NOT NULL DEFAULT 'BRL',
  status              TEXT NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING','PROCESSING','COMPLETED','FAILED')),
  provider_refund_id  TEXT,
  initiated_by        UUID NOT NULL REFERENCES user_profiles(id),
  approved_by         UUID REFERENCES user_profiles(id),
  processed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_refunds_payment ON refunds (payment_id);
CREATE INDEX idx_refunds_booking ON refunds (booking_id);
CREATE INDEX idx_refunds_idempotency ON refunds (idempotency_key);

CREATE TRIGGER trg_refunds_updated_at
  BEFORE UPDATE ON refunds
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 26. reviews
-- ============================================================================
CREATE TABLE reviews (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id               UUID NOT NULL UNIQUE REFERENCES bookings(id),
  customer_profile_id      UUID NOT NULL REFERENCES customer_profiles(id),
  professional_profile_id  UUID NOT NULL REFERENCES professional_profiles(id),
  overall_rating           SMALLINT NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  quality_rating           SMALLINT CHECK (quality_rating IS NULL OR quality_rating BETWEEN 1 AND 5),
  punctuality_rating       SMALLINT CHECK (punctuality_rating IS NULL OR punctuality_rating BETWEEN 1 AND 5),
  care_rating              SMALLINT CHECK (care_rating IS NULL OR care_rating BETWEEN 1 AND 5),
  communication_rating     SMALLINT CHECK (communication_rating IS NULL OR communication_rating BETWEEN 1 AND 5),
  comment                  TEXT,
  is_visible               BOOLEAN NOT NULL DEFAULT true,
  moderation_status        TEXT NOT NULL DEFAULT 'ACTIVE'
                             CHECK (moderation_status IN ('ACTIVE','HIDDEN','FLAGGED')),
  moderation_reason        TEXT,
  moderated_by             UUID REFERENCES user_profiles(id),
  moderated_at             TIMESTAMPTZ,
  original_comment         TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reviews_professional ON reviews (professional_profile_id);
CREATE INDEX idx_reviews_customer ON reviews (customer_profile_id);
CREATE INDEX idx_reviews_booking ON reviews (booking_id);

CREATE TRIGGER trg_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 27. favorites
-- ============================================================================
CREATE TABLE favorites (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_profile_id      UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  professional_profile_id  UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (customer_profile_id, professional_profile_id)
);

-- ============================================================================
-- 28. notifications
-- ============================================================================
CREATE TABLE notifications (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id  UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  type             TEXT NOT NULL,
  title            TEXT NOT NULL,
  body             TEXT NOT NULL,
  data             JSONB DEFAULT '{}',
  channel          TEXT NOT NULL DEFAULT 'IN_APP'
                     CHECK (channel IN ('IN_APP','PUSH','SMS','EMAIL')),
  is_read          BOOLEAN NOT NULL DEFAULT false,
  read_at          TIMESTAMPTZ,
  sent_at          TIMESTAMPTZ,
  delivery_status  TEXT DEFAULT 'PENDING',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread ON notifications (user_profile_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_type ON notifications (type);

-- ============================================================================
-- 29. support_tickets
-- ============================================================================
CREATE TABLE support_tickets (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number  TEXT NOT NULL UNIQUE,
  booking_id     UUID REFERENCES bookings(id),
  created_by     UUID NOT NULL REFERENCES user_profiles(id),
  assigned_to    UUID REFERENCES user_profiles(id),
  category       TEXT NOT NULL,
  subject        TEXT NOT NULL,
  description    TEXT NOT NULL,
  priority       TEXT NOT NULL DEFAULT 'MEDIUM'
                   CHECK (priority IN ('LOW','MEDIUM','HIGH','URGENT')),
  status         TEXT NOT NULL DEFAULT 'OPEN'
                   CHECK (status IN ('OPEN','IN_PROGRESS','WAITING_CUSTOMER','WAITING_INTERNAL','RESOLVED','CLOSED')),
  resolution     TEXT,
  resolved_at    TIMESTAMPTZ,
  closed_at      TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tickets_created_by ON support_tickets (created_by);
CREATE INDEX idx_tickets_booking ON support_tickets (booking_id);
CREATE INDEX idx_tickets_status ON support_tickets (status);

CREATE TRIGGER trg_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 30. disputes
-- ============================================================================
CREATE TABLE disputes (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id              UUID NOT NULL REFERENCES bookings(id),
  opened_by               UUID NOT NULL REFERENCES user_profiles(id),
  assigned_to             UUID REFERENCES user_profiles(id),
  type                    TEXT NOT NULL
                            CHECK (type IN (
                              'NO_SHOW_PROFESSIONAL','NO_SHOW_CUSTOMER','LATE_ARRIVAL',
                              'SERVICE_QUALITY','BEHAVIOR','DAMAGE','PAYMENT','OTHER'
                            )),
  description             TEXT NOT NULL,
  status                  TEXT NOT NULL DEFAULT 'OPEN'
                            CHECK (status IN (
                              'OPEN','UNDER_REVIEW','AWAITING_EVIDENCE',
                              'RESOLVED_CUSTOMER','RESOLVED_PROFESSIONAL',
                              'RESOLVED_PARTIAL','CLOSED'
                            )),
  resolution              TEXT,
  resolution_amount_cents INTEGER,
  evidence_urls           JSONB DEFAULT '[]',
  blocks_payout           BOOLEAN NOT NULL DEFAULT true,
  resolved_by             UUID REFERENCES user_profiles(id),
  resolved_at             TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_disputes_booking ON disputes (booking_id);
CREATE INDEX idx_disputes_status ON disputes (status);

CREATE TRIGGER trg_disputes_updated_at
  BEFORE UPDATE ON disputes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 31. cancellation_policies (já criada acima, seção 17)
-- ============================================================================

-- ============================================================================
-- 32. platform_settings
-- ============================================================================
CREATE TABLE platform_settings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key           TEXT NOT NULL UNIQUE,
  value         JSONB NOT NULL,
  description   TEXT,
  category      TEXT NOT NULL DEFAULT 'general',
  is_sensitive  BOOLEAN NOT NULL DEFAULT false,
  updated_by    UUID REFERENCES user_profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_platform_settings_updated_at
  BEFORE UPDATE ON platform_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 33. platform_settings_history
-- ============================================================================
CREATE TABLE platform_settings_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_id      UUID NOT NULL REFERENCES platform_settings(id),
  previous_value  JSONB,
  new_value       JSONB NOT NULL,
  changed_by      UUID NOT NULL REFERENCES user_profiles(id),
  reason          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 34. audit_log
-- ============================================================================
CREATE TABLE audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id        UUID REFERENCES user_profiles(id),
  actor_role      TEXT,
  action          TEXT NOT NULL,
  entity_type     TEXT NOT NULL,
  entity_id       UUID,
  previous_value  JSONB,
  new_value       JSONB,
  ip_address      INET,
  user_agent      TEXT,
  correlation_id  UUID,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_actor ON audit_log (actor_id);
CREATE INDEX idx_audit_entity ON audit_log (entity_type, entity_id);
CREATE INDEX idx_audit_action ON audit_log (action);
CREATE INDEX idx_audit_created ON audit_log (created_at);

-- Proteger audit_log contra UPDATE e DELETE
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only. UPDATE and DELETE are not allowed.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_log_no_update
  BEFORE UPDATE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

CREATE TRIGGER trg_audit_log_no_delete
  BEFORE DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

-- ============================================================================
-- 35. user_blocks
-- ============================================================================
CREATE TABLE user_blocks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id  UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  blocked_id  UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

-- ============================================================================
-- AUDIT TRIGGER: automatic logging for platform_settings changes
-- ============================================================================
CREATE OR REPLACE FUNCTION audit_platform_settings_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO platform_settings_history (
    setting_id,
    previous_value,
    new_value,
    changed_by,
    reason
  ) VALUES (
    NEW.id,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.value ELSE NULL END,
    NEW.value,
    COALESCE(NEW.updated_by, OLD.updated_by),
    'Auto-tracked by trigger'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_platform_settings_audit
  AFTER INSERT OR UPDATE ON platform_settings
  FOR EACH ROW EXECUTE FUNCTION audit_platform_settings_change();

-- ============================================================================
-- FUNCTION: generate_booking_number
-- Formato: HF-YYYYMMDD-XXXX (4 caracteres aleatórios alfanuméricos)
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS TEXT AS $$
DECLARE
  v_date TEXT;
  v_rand TEXT;
  v_number TEXT;
  v_exists BOOLEAN;
BEGIN
  v_date := to_char(now(), 'YYYYMMDD');
  LOOP
    v_rand := upper(substr(md5(gen_random_uuid()::text), 1, 4));
    v_number := 'HF-' || v_date || '-' || v_rand;
    SELECT EXISTS(SELECT 1 FROM bookings WHERE booking_number = v_number) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: generate_ticket_number
-- Formato: TK-YYYYMMDD-XXXX
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
  v_date TEXT;
  v_rand TEXT;
  v_number TEXT;
  v_exists BOOLEAN;
BEGIN
  v_date := to_char(now(), 'YYYYMMDD');
  LOOP
    v_rand := upper(substr(md5(gen_random_uuid()::text), 1, 4));
    v_number := 'TK-' || v_date || '-' || v_rand;
    SELECT EXISTS(SELECT 1 FROM support_tickets WHERE ticket_number = v_number) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENT: Table purposes (for documentation tools)
-- ============================================================================
COMMENT ON TABLE user_profiles IS 'Perfil comum a todos os papéis. Ponte entre auth.users e perfis específicos.';
COMMENT ON TABLE customer_profiles IS 'Dados específicos do cliente. CPF armazenado como hash.';
COMMENT ON TABLE professional_profiles IS 'Dados específicos do profissional. Dados sensíveis criptografados.';
COMMENT ON TABLE addresses IS 'Endereços de clientes e profissionais. Instruções de acesso com proteção reforçada.';
COMMENT ON TABLE professional_documents IS 'Documentos enviados para verificação. Storage privado com signed URLs.';
COMMENT ON TABLE identity_verifications IS 'Histórico de verificações de identidade. Auditável.';
COMMENT ON TABLE service_categories IS 'Categorias de serviço configuráveis pelo admin.';
COMMENT ON TABLE services IS 'Serviços da plataforma. Nunca hardcoded no app.';
COMMENT ON TABLE service_addons IS 'Adicionais configuráveis.';
COMMENT ON TABLE service_addon_links IS 'Vinculação de adicionais compatíveis por serviço.';
COMMENT ON TABLE professional_services IS 'Serviços oferecidos por cada profissional com preço HYBRID.';
COMMENT ON TABLE service_areas IS 'Regiões de atendimento do profissional.';
COMMENT ON TABLE availability_rules IS 'Horários regulares de disponibilidade.';
COMMENT ON TABLE availability_exceptions IS 'Bloqueios e exceções pontuais na agenda.';
COMMENT ON TABLE pricing_rules IS 'Regras de precificação da plataforma. Versionadas com vigência.';
COMMENT ON TABLE price_quotes IS 'Cotações versionadas com validade. Nunca excluir.';
COMMENT ON TABLE bookings IS 'Agendamentos de serviço. Entidade central com state machine de 17 estados.';
COMMENT ON TABLE booking_items IS 'Itens do booking (adicionais selecionados).';
COMMENT ON TABLE booking_status_history IS 'Histórico imutável de transições de status.';
COMMENT ON TABLE payments IS 'Pagamentos vinculados a bookings. Nunca excluir.';
COMMENT ON TABLE payment_transactions IS 'Operações individuais do provedor de pagamento.';
COMMENT ON TABLE ledger_entries IS 'Partidas contábeis auditáveis. Append-only.';
COMMENT ON TABLE payouts IS 'Repasses de valores ao profissional.';
COMMENT ON TABLE refunds IS 'Reembolsos processados.';
COMMENT ON TABLE reviews IS 'Avaliações de bookings concluídos. Uma por booking.';
COMMENT ON TABLE favorites IS 'Profissionais favoritos do cliente.';
COMMENT ON TABLE notifications IS 'Notificações do sistema.';
COMMENT ON TABLE support_tickets IS 'Chamados de suporte.';
COMMENT ON TABLE disputes IS 'Disputas financeiras ou de serviço.';
COMMENT ON TABLE cancellation_policies IS 'Políticas de cancelamento versionadas.';
COMMENT ON TABLE platform_settings IS 'Configurações globais da plataforma.';
COMMENT ON TABLE platform_settings_history IS 'Histórico de alterações em configurações.';
COMMENT ON TABLE audit_log IS 'Trilha de auditoria imutável. Append-only, sem UPDATE/DELETE.';
COMMENT ON TABLE user_blocks IS 'Bloqueios entre usuários.';
