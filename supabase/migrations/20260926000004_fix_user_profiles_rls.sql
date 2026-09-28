-- Adiciona uma política de segurança para permitir que clientes 
-- vejam os nomes e fotos das profissionais.

CREATE POLICY "Todos autenticados podem ver perfis de profissionais"
ON public.user_profiles
FOR SELECT TO authenticated
USING (role = 'PROFESSIONAL');
