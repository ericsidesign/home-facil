Para ativar o programa de fidelidade, nós só precisamos adicionar a nova "gaveta" (coluna) para guardar os pontos no banco de dados.

Copie e cole o código abaixo no seu **SQL Editor** do Supabase:

```sql
-- Adiciona a coluna de pontos de fidelidade na tabela de clientes
ALTER TABLE customer_profiles
ADD COLUMN IF NOT EXISTS loyalty_points INTEGER NOT NULL DEFAULT 0;
```

*(Agora está formatadinho no bloco de código para facilitar a cópia!)*
