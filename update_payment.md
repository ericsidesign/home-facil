-- Adicionar Tabela de Métodos de Pagamento
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_profile_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
    card_brand TEXT NOT NULL,
    last_four TEXT NOT NULL,
    expiry_month INTEGER NOT NULL,
    expiry_year INTEGER NOT NULL,
    cardholder_name TEXT NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ativar RLS (Segurança)
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Criar política de acesso total para usuários logados
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'payment_methods_all_auth' AND tablename = 'payment_methods') THEN
        CREATE POLICY payment_methods_all_auth ON payment_methods FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;
