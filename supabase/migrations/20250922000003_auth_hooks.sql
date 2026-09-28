-- ============================================================================
-- Home Fácil — Migration 003: Custom Claims & Auth Hooks
-- Injeta o role do user_profiles como custom claim no JWT do Supabase Auth.
-- ============================================================================

-- ============================================================================
-- FUNCTION: custom_access_token_hook
-- Chamada pelo Supabase Auth a cada geração de token.
-- Injeta user_role e user_profile_id no JWT.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB AS $$
DECLARE
  claims JSONB;
  v_user_profile_id UUID;
  v_role TEXT;
BEGIN
  claims := event->'claims';

  -- Buscar role e profile_id do usuário
  SELECT id, role
  INTO v_user_profile_id, v_role
  FROM public.user_profiles
  WHERE auth_user_id = (event->>'user_id')::UUID
    AND deleted_at IS NULL
  LIMIT 1;

  IF v_user_profile_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{user_role}', to_jsonb(v_role));
    claims := jsonb_set(claims, '{user_profile_id}', to_jsonb(v_user_profile_id::TEXT));
  ELSE
    claims := jsonb_set(claims, '{user_role}', '"ANONYMOUS"');
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Conceder permissões necessárias
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
GRANT SELECT ON TABLE public.user_profiles TO supabase_auth_admin;

-- Revogar acesso anon ao hook (segurança)
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

-- ============================================================================
-- FUNCTION: handle_new_user
-- Trigger chamado automaticamente quando um novo usuário é criado no auth.users.
-- Cria o user_profile e o perfil específico (customer por padrão).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_profile_id UUID;
  v_role TEXT;
  v_full_name TEXT;
BEGIN
  -- Extrair role dos metadata (definido durante sign-up)
  v_role := COALESCE(
    NEW.raw_user_meta_data->>'role',
    'CUSTOMER'
  );

  -- Validar role permitido no sign-up
  IF v_role NOT IN ('CUSTOMER', 'PROFESSIONAL') THEN
    v_role := 'CUSTOMER';
  END IF;

  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    ''
  );

  -- Criar user_profile
  INSERT INTO public.user_profiles (
    auth_user_id,
    role,
    full_name,
    display_name,
    phone_verified,
    email_verified
  ) VALUES (
    NEW.id,
    v_role,
    v_full_name,
    COALESCE(NEW.raw_user_meta_data->>'display_name', v_full_name),
    COALESCE(NEW.phone_confirmed_at IS NOT NULL, false),
    COALESCE(NEW.email_confirmed_at IS NOT NULL, false)
  )
  RETURNING id INTO v_profile_id;

  -- Criar perfil específico
  IF v_role = 'CUSTOMER' THEN
    INSERT INTO public.customer_profiles (user_profile_id)
    VALUES (v_profile_id);
  ELSIF v_role = 'PROFESSIONAL' THEN
    INSERT INTO public.professional_profiles (user_profile_id)
    VALUES (v_profile_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger no auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- FUNCTION: handle_user_verification
-- Atualiza phone_verified e email_verified quando o Supabase Auth confirma.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_user_verification()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.phone_confirmed_at IS NULL AND NEW.phone_confirmed_at IS NOT NULL THEN
    UPDATE public.user_profiles
    SET phone_verified = true
    WHERE auth_user_id = NEW.id;
  END IF;

  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    UPDATE public.user_profiles
    SET email_verified = true
    WHERE auth_user_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_verification();
