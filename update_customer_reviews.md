Para implementar as Avaliações de Clientes, nós precisamos adicionar o sistema de notas no banco de dados.

Copie o código abaixo e rode no **SQL Editor** do Supabase:

```sql
-- 1. Adicionar os medidores de nota no perfil do cliente
ALTER TABLE customer_profiles
ADD COLUMN IF NOT EXISTS rating_average NUMERIC(3,2) NOT NULL DEFAULT 5.00,
ADD COLUMN IF NOT EXISTS rating_count INTEGER NOT NULL DEFAULT 0;

-- 2. Criar a tabela onde as notas dadas pelas profissionais serão guardadas
CREATE TABLE IF NOT EXISTS customer_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    customer_profile_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
    professional_profile_id UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(booking_id) -- Apenas 1 avaliação por faxina
);

-- 3. Configurar a segurança para permitir a leitura e escrita
ALTER TABLE customer_reviews ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'cust_reviews_all_auth' AND tablename = 'customer_reviews') THEN
        CREATE POLICY cust_reviews_all_auth ON customer_reviews FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;
```
