Para tornarmos a tela de **Configurações** 100% real, precisamos que o banco de dados guarde essas preferências para cada usuário. Vamos adicionar as colunas necessárias na tabela de perfis.

Copie o código abaixo e rode no **SQL Editor** do Supabase:

```sql
-- Adicionar as colunas de preferências no perfil do usuário
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS dark_mode_enabled BOOLEAN NOT NULL DEFAULT false;
```
