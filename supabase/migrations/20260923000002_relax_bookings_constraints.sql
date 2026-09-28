-- Relax constraints for prototyping
ALTER TABLE bookings
ALTER COLUMN professional_profile_id DROP NOT NULL,
ALTER COLUMN address_id DROP NOT NULL,
ALTER COLUMN price_quote_id DROP NOT NULL,
ALTER COLUMN property_type DROP NOT NULL,
ALTER COLUMN area_bracket DROP NOT NULL,
ALTER COLUMN bedrooms DROP NOT NULL,
ALTER COLUMN bathrooms DROP NOT NULL,
ALTER COLUMN materials_provided_by DROP NOT NULL,
ALTER COLUMN cancellation_policy_snapshot DROP NOT NULL,
ALTER COLUMN price_snapshot DROP NOT NULL,
ALTER COLUMN gross_amount_cents DROP NOT NULL,
ALTER COLUMN platform_fee_cents DROP NOT NULL,
ALTER COLUMN professional_net_cents DROP NOT NULL;

-- Also add the columns the frontend is currently trying to use:
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS customer_id UUID,
ADD COLUMN IF NOT EXISTS service_category_id UUID,
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS total_amount NUMERIC,
ADD COLUMN IF NOT EXISTS address_snapshot JSONB,
ADD COLUMN IF NOT EXISTS frequency TEXT;
ALTER TABLE bookings ALTER COLUMN booking_number DROP NOT NULL;
