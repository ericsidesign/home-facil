-- ============================================================================
-- Home Fácil — Seed Data
-- Dados iniciais para o MVP: categorias, serviços, adicionais e configurações.
-- ============================================================================

-- ============================================================================
-- CATEGORIAS DE SERVIÇO
-- ============================================================================
INSERT INTO service_categories (name, slug, description, sort_order, is_active) VALUES
  ('Limpeza Residencial', 'limpeza-residencial', 'Limpeza completa do seu lar, incluindo todos os cômodos.', 1, true),
  ('Faxina Pesada', 'faxina-pesada', 'Limpeza profunda para ambientes que necessitam de cuidado extra.', 2, true),
  ('Limpeza Pré-Mudança', 'limpeza-pre-mudanca', 'Prepare o imóvel antes da sua mudança com uma limpeza completa.', 3, true),
  ('Limpeza Pós-Mudança', 'limpeza-pos-mudanca', 'Limpe o imóvel que você acabou de deixar ou o novo que vai ocupar.', 4, true),
  ('Organização Residencial', 'organizacao-residencial', 'Organização profissional de armários, closets e ambientes.', 5, true);

-- ============================================================================
-- SERVIÇOS
-- ============================================================================

-- Limpeza Residencial
INSERT INTO services (category_id, name, slug, description, included_items, excluded_items, estimated_duration_minutes, max_area_sqm, client_instructions, materials_rules, sort_order) VALUES
(
  (SELECT id FROM service_categories WHERE slug = 'limpeza-residencial'),
  'Limpeza Residencial Padrão',
  'limpeza-residencial-padrao',
  'Limpeza completa do seu lar. Inclui varrer, aspirar, passar pano, limpar banheiros, cozinha e áreas comuns.',
  '["Varrer e aspirar todos os cômodos", "Passar pano úmido nos pisos", "Limpar banheiros (pia, vaso, box, espelho)", "Limpar cozinha (pia, fogão por fora, bancada)", "Tirar pó de móveis e superfícies", "Recolher e organizar lixo", "Arrumar camas"]'::jsonb,
  '["Limpeza interna de geladeira", "Limpeza interna de forno", "Limpeza interna de armários", "Limpeza de janelas", "Área externa", "Passar roupas"]'::jsonb,
  180,
  150,
  'Certifique-se de que o profissional terá acesso ao imóvel no horário agendado. Deixe os materiais de limpeza disponíveis, caso não tenha contratado o fornecimento pelo profissional.',
  'Caso o cliente forneça os materiais: vassoura, rodo, pano de chão, produtos de limpeza multiuso, desinfetante e pano de pó. Caso o profissional forneça: taxa adicional aplicável.',
  1
),
-- Faxina Pesada
(
  (SELECT id FROM service_categories WHERE slug = 'faxina-pesada'),
  'Faxina Pesada',
  'faxina-pesada',
  'Limpeza profunda para ambientes que necessitam de cuidado extra. Inclui remoção de gordura, limpeza de rejuntes e áreas de difícil acesso.',
  '["Tudo incluído na limpeza padrão", "Remoção de gordura acumulada", "Limpeza de rejuntes", "Limpeza de áreas de difícil acesso", "Limpeza detalhada de banheiros", "Limpeza detalhada da cozinha"]'::jsonb,
  '["Limpeza interna de geladeira", "Limpeza interna de forno", "Limpeza interna de armários", "Limpeza de janelas", "Área externa"]'::jsonb,
  300,
  150,
  'A faxina pesada pode levar mais tempo dependendo do estado do imóvel. Informe nas observações se há áreas com acúmulo significativo de sujeira.',
  'Recomendamos produtos de limpeza pesada, desengordurante, limpa-pedras e esponjas abrasivas apropriadas para cada superfície.',
  1
),
-- Pré-mudança
(
  (SELECT id FROM service_categories WHERE slug = 'limpeza-pre-mudanca'),
  'Limpeza Pré-Mudança',
  'limpeza-pre-mudanca',
  'Prepare o imóvel antes de se mudar. Limpeza completa de todos os ambientes para receber seus pertences.',
  '["Limpeza completa de todos os cômodos", "Limpeza de banheiros", "Limpeza de cozinha", "Limpeza de armários embutidos por dentro e por fora", "Limpeza de janelas internas", "Remoção de poeira acumulada"]'::jsonb,
  '["Remoção de manchas profundas em paredes", "Limpeza de área externa grande", "Polimento de pisos"]'::jsonb,
  240,
  200,
  'Idealmente o imóvel deve estar vazio ou com poucos itens para facilitar o acesso a todas as áreas.',
  'Produtos de limpeza multiuso, desinfetante, limpa-vidros e panos de microfibra.',
  1
),
-- Pós-mudança
(
  (SELECT id FROM service_categories WHERE slug = 'limpeza-pos-mudanca'),
  'Limpeza Pós-Mudança',
  'limpeza-pos-mudanca',
  'Limpe o imóvel que você deixou para entregá-lo em boas condições, ou o novo lar antes de organizar tudo.',
  '["Limpeza completa de todos os cômodos", "Limpeza de banheiros", "Limpeza de cozinha", "Remoção de poeira de mudança", "Limpeza de pisos", "Limpeza de superfícies"]'::jsonb,
  '["Remoção de resíduos de obra", "Limpeza de área externa", "Polimento de pisos"]'::jsonb,
  240,
  200,
  'Se houver resíduos de obra ou reforma, informe nas observações para que o profissional leve os materiais adequados.',
  'Produtos de limpeza multiuso, desinfetante e materiais para remoção de poeira fina.',
  1
),
-- Organização
(
  (SELECT id FROM service_categories WHERE slug = 'organizacao-residencial'),
  'Organização de Ambientes',
  'organizacao-ambientes',
  'Organização profissional de armários, closets, despensas e outros ambientes. Otimize o uso do espaço.',
  '["Organização de armários e gavetas", "Categorização de itens", "Dobras e organização de roupas", "Otimização de espaço", "Sugestões de organização"]'::jsonb,
  '["Compra de organizadores", "Montagem de móveis", "Limpeza pesada", "Descarte de itens (responsabilidade do cliente)"]'::jsonb,
  180,
  NULL,
  'Defina previamente quais ambientes deseja organizar. Esteja presente ou disponível para decisões sobre o destino de itens.',
  'Organizadores, caixas e etiquetas podem ser necessários. Informe se deseja que o profissional sugira ou traga organizadores (custo adicional).',
  1
);

-- ============================================================================
-- ADICIONAIS
-- ============================================================================
INSERT INTO service_addons (name, slug, description, estimated_duration_minutes, sort_order) VALUES
  ('Limpeza Interna de Geladeira', 'limpeza-geladeira', 'Limpeza e higienização interna completa da geladeira, incluindo prateleiras e gavetas.', 30, 1),
  ('Limpeza Interna de Forno', 'limpeza-forno', 'Remoção de gordura e resíduos internos do forno.', 30, 2),
  ('Limpeza Interna de Armários', 'limpeza-armarios', 'Limpeza e organização do interior dos armários de cozinha ou banheiro.', 45, 3),
  ('Limpeza de Janelas', 'limpeza-janelas', 'Limpeza de vidros e esquadrias de janelas acessíveis (sem risco de altura).', 30, 4),
  ('Limpeza de Área Externa', 'limpeza-area-externa', 'Limpeza de varanda, quintal ou área de serviço.', 45, 5),
  ('Passar Roupas', 'passar-roupas', 'Serviço de passar roupas a ferro. Quantidade estimada: até 20 peças.', 60, 6),
  ('Organização de Cômodo', 'organizacao-comodo', 'Organização profissional de um cômodo específico (quarto, sala ou escritório).', 60, 7),
  ('Fornecimento de Materiais', 'fornecimento-materiais', 'O profissional levará todos os materiais e produtos de limpeza necessários.', 0, 8);

-- ============================================================================
-- VINCULAÇÃO ADICIONAIS ↔ SERVIÇOS
-- ============================================================================

-- Todos os adicionais são compatíveis com todos os serviços de limpeza
INSERT INTO service_addon_links (service_id, addon_id, is_default)
SELECT s.id, a.id, false
FROM services s
CROSS JOIN service_addons a
WHERE s.slug IN ('limpeza-residencial-padrao', 'faxina-pesada', 'limpeza-pre-mudanca', 'limpeza-pos-mudanca')
  AND a.slug != 'organizacao-comodo';

-- Organização: apenas fornecimento de materiais como adicional
INSERT INTO service_addon_links (service_id, addon_id, is_default)
SELECT s.id, a.id, false
FROM services s
CROSS JOIN service_addons a
WHERE s.slug = 'organizacao-ambientes'
  AND a.slug = 'fornecimento-materiais';

-- ============================================================================
-- CONFIGURAÇÕES DA PLATAFORMA
-- ============================================================================
INSERT INTO platform_settings (key, value, description, category, is_sensitive) VALUES
  ('platform_fee_percentage', '8.00', 'Porcentagem de comissão da plataforma sobre cada serviço.', 'financial', false),
  ('currency', '"BRL"', 'Moeda padrão da plataforma.', 'general', false),
  ('booking_accept_timeout_minutes', '60', 'Tempo máximo em minutos para o profissional aceitar uma solicitação.', 'booking', false),
  ('booking_auto_complete_hours', '24', 'Horas após check-out para encerramento automático se o cliente não responder.', 'booking', false),
  ('price_quote_validity_minutes', '30', 'Validade da cotação em minutos.', 'pricing', false),
  ('min_booking_advance_hours', '4', 'Antecedência mínima em horas para agendar um serviço.', 'booking', false),
  ('max_booking_advance_days', '30', 'Antecedência máxima em dias para agendar um serviço.', 'booking', false),
  ('professional_buffer_minutes', '60', 'Tempo de buffer entre serviços do profissional para deslocamento.', 'booking', false),
  ('tip_enabled', 'false', 'Habilitar gorjetas (V1).', 'financial', false),
  ('tip_percentage_options', '[5, 10, 15, 20]', 'Opções de porcentagem de gorjeta.', 'financial', false),
  ('tip_professional_share_percentage', '100', 'Porcentagem da gorjeta destinada ao profissional.', 'financial', false),
  ('coupon_enabled', 'false', 'Habilitar cupons de desconto (V1).', 'financial', false),
  ('kyc_provider', '"MANUAL"', 'Provedor de verificação de identidade.', 'verification', true),
  ('payment_provider', '"NONE"', 'Provedor de pagamento (aguardando decisão).', 'financial', true),
  ('push_notifications_enabled', 'false', 'Habilitar notificações push.', 'notifications', false),
  ('sms_notifications_enabled', 'false', 'Habilitar notificações SMS.', 'notifications', false),
  ('email_notifications_enabled', 'true', 'Habilitar notificações por e-mail.', 'notifications', false),
  ('max_professional_resubmissions', '3', 'Número máximo de reenvios de documentos para verificação.', 'verification', false),
  ('review_min_comment_length', '0', 'Tamanho mínimo do comentário na avaliação (0 = opcional).', 'reviews', false),
  ('default_cancellation_policy_id', 'null', 'ID da política de cancelamento padrão.', 'booking', false),
  ('supported_regions', '[]', 'Regiões atendidas pela plataforma (vazio = sem restrição).', 'general', false),
  ('maintenance_mode', 'false', 'Modo de manutenção. Bloqueia novos bookings.', 'general', true);

-- ============================================================================
-- REGRAS DE PREÇO INICIAIS (exemplo: Limpeza Residencial Padrão)
-- ============================================================================
INSERT INTO pricing_rules (
  service_id,
  region_state,
  region_city,
  strategy,
  base_price_cents,
  min_price_cents,
  max_price_cents,
  area_bracket_rules,
  bedroom_price_cents,
  bathroom_price_cents,
  addon_prices,
  materials_fee_cents,
  version
) VALUES
(
  (SELECT id FROM services WHERE slug = 'limpeza-residencial-padrao'),
  NULL, -- todas as regiões
  NULL,
  'HYBRID',
  15000, -- R$ 150,00
  10000, -- R$ 100,00 mínimo
  40000, -- R$ 400,00 máximo
  '[
    {"label": "Até 50m²", "min_sqm": 0, "max_sqm": 50, "adjustment_cents": 0},
    {"label": "51-80m²", "min_sqm": 51, "max_sqm": 80, "adjustment_cents": 3000},
    {"label": "81-120m²", "min_sqm": 81, "max_sqm": 120, "adjustment_cents": 6000},
    {"label": "121-200m²", "min_sqm": 121, "max_sqm": 200, "adjustment_cents": 10000},
    {"label": "Acima de 200m²", "min_sqm": 201, "max_sqm": null, "adjustment_cents": 15000}
  ]'::jsonb,
  2000, -- R$ 20,00 por quarto adicional (base: 2 quartos)
  1500, -- R$ 15,00 por banheiro adicional (base: 1 banheiro)
  (
    SELECT jsonb_object_agg(a.id::text, CASE a.slug
      WHEN 'limpeza-geladeira' THEN 3000
      WHEN 'limpeza-forno' THEN 2500
      WHEN 'limpeza-armarios' THEN 3500
      WHEN 'limpeza-janelas' THEN 2500
      WHEN 'limpeza-area-externa' THEN 4000
      WHEN 'passar-roupas' THEN 3500
      WHEN 'organizacao-comodo' THEN 5000
      WHEN 'fornecimento-materiais' THEN 3000
    END)
    FROM service_addons a
  ),
  3000, -- R$ 30,00 taxa de materiais
  1
),
-- Faxina Pesada
(
  (SELECT id FROM services WHERE slug = 'faxina-pesada'),
  NULL, NULL,
  'HYBRID',
  25000, -- R$ 250,00
  15000, -- R$ 150,00
  60000, -- R$ 600,00
  '[
    {"label": "Até 50m²", "min_sqm": 0, "max_sqm": 50, "adjustment_cents": 0},
    {"label": "51-80m²", "min_sqm": 51, "max_sqm": 80, "adjustment_cents": 5000},
    {"label": "81-120m²", "min_sqm": 81, "max_sqm": 120, "adjustment_cents": 10000},
    {"label": "121-200m²", "min_sqm": 121, "max_sqm": 200, "adjustment_cents": 15000},
    {"label": "Acima de 200m²", "min_sqm": 201, "max_sqm": null, "adjustment_cents": 20000}
  ]'::jsonb,
  3000,
  2000,
  (
    SELECT jsonb_object_agg(a.id::text, CASE a.slug
      WHEN 'limpeza-geladeira' THEN 3000
      WHEN 'limpeza-forno' THEN 2500
      WHEN 'limpeza-armarios' THEN 3500
      WHEN 'limpeza-janelas' THEN 2500
      WHEN 'limpeza-area-externa' THEN 4000
      WHEN 'passar-roupas' THEN 3500
      WHEN 'organizacao-comodo' THEN 5000
      WHEN 'fornecimento-materiais' THEN 3000
    END)
    FROM service_addons a
  ),
  3000,
  1
),
-- Pré-mudança
(
  (SELECT id FROM services WHERE slug = 'limpeza-pre-mudanca'),
  NULL, NULL,
  'HYBRID',
  20000,
  12000,
  50000,
  '[
    {"label": "Até 50m²", "min_sqm": 0, "max_sqm": 50, "adjustment_cents": 0},
    {"label": "51-80m²", "min_sqm": 51, "max_sqm": 80, "adjustment_cents": 4000},
    {"label": "81-120m²", "min_sqm": 81, "max_sqm": 120, "adjustment_cents": 8000},
    {"label": "121-200m²", "min_sqm": 121, "max_sqm": 200, "adjustment_cents": 12000},
    {"label": "Acima de 200m²", "min_sqm": 201, "max_sqm": null, "adjustment_cents": 18000}
  ]'::jsonb,
  2500,
  2000,
  (
    SELECT jsonb_object_agg(a.id::text, CASE a.slug
      WHEN 'limpeza-geladeira' THEN 3000
      WHEN 'limpeza-forno' THEN 2500
      WHEN 'limpeza-armarios' THEN 3500
      WHEN 'limpeza-janelas' THEN 2500
      WHEN 'limpeza-area-externa' THEN 4000
      WHEN 'passar-roupas' THEN 3500
      WHEN 'organizacao-comodo' THEN 5000
      WHEN 'fornecimento-materiais' THEN 3000
    END)
    FROM service_addons a
  ),
  3000,
  1
),
-- Pós-mudança
(
  (SELECT id FROM services WHERE slug = 'limpeza-pos-mudanca'),
  NULL, NULL,
  'HYBRID',
  20000,
  12000,
  50000,
  '[
    {"label": "Até 50m²", "min_sqm": 0, "max_sqm": 50, "adjustment_cents": 0},
    {"label": "51-80m²", "min_sqm": 51, "max_sqm": 80, "adjustment_cents": 4000},
    {"label": "81-120m²", "min_sqm": 81, "max_sqm": 120, "adjustment_cents": 8000},
    {"label": "121-200m²", "min_sqm": 121, "max_sqm": 200, "adjustment_cents": 12000},
    {"label": "Acima de 200m²", "min_sqm": 201, "max_sqm": null, "adjustment_cents": 18000}
  ]'::jsonb,
  2500,
  2000,
  (
    SELECT jsonb_object_agg(a.id::text, CASE a.slug
      WHEN 'limpeza-geladeira' THEN 3000
      WHEN 'limpeza-forno' THEN 2500
      WHEN 'limpeza-armarios' THEN 3500
      WHEN 'limpeza-janelas' THEN 2500
      WHEN 'limpeza-area-externa' THEN 4000
      WHEN 'passar-roupas' THEN 3500
      WHEN 'organizacao-comodo' THEN 5000
      WHEN 'fornecimento-materiais' THEN 3000
    END)
    FROM service_addons a
  ),
  3000,
  1
),
-- Organização
(
  (SELECT id FROM services WHERE slug = 'organizacao-ambientes'),
  NULL, NULL,
  'HYBRID',
  18000,
  10000,
  45000,
  '[]'::jsonb,
  0,
  0,
  (
    SELECT jsonb_object_agg(a.id::text, 3000)
    FROM service_addons a
    WHERE a.slug = 'fornecimento-materiais'
  ),
  0,
  1
);

-- ============================================================================
-- POLÍTICA DE CANCELAMENTO PADRÃO
-- ============================================================================
INSERT INTO cancellation_policies (name, version, rules, is_active, effective_from, created_by) VALUES
(
  'Política Padrão MVP',
  1,
  '{
    "rules": [
      {
        "scenario": "customer_cancel_24h_before",
        "description": "Cliente cancela com mais de 24h de antecedência",
        "refund_percentage": 100,
        "professional_compensation_percentage": 0
      },
      {
        "scenario": "customer_cancel_12_to_24h",
        "description": "Cliente cancela entre 12h e 24h antes do serviço",
        "refund_percentage": 50,
        "professional_compensation_percentage": 25
      },
      {
        "scenario": "customer_cancel_less_12h",
        "description": "Cliente cancela com menos de 12h de antecedência",
        "refund_percentage": 0,
        "professional_compensation_percentage": 50
      },
      {
        "scenario": "customer_cancel_after_checkin",
        "description": "Cliente cancela após check-in do profissional",
        "refund_percentage": 0,
        "professional_compensation_percentage": 100
      },
      {
        "scenario": "professional_cancel_24h_before",
        "description": "Profissional cancela com mais de 24h de antecedência",
        "refund_percentage": 100,
        "professional_compensation_percentage": 0,
        "professional_penalty": "warning"
      },
      {
        "scenario": "professional_cancel_less_24h",
        "description": "Profissional cancela com menos de 24h de antecedência",
        "refund_percentage": 100,
        "professional_compensation_percentage": 0,
        "professional_penalty": "strike"
      },
      {
        "scenario": "professional_no_show",
        "description": "Profissional não comparece ao serviço",
        "refund_percentage": 100,
        "professional_compensation_percentage": 0,
        "professional_penalty": "suspension_review"
      },
      {
        "scenario": "customer_no_show",
        "description": "Cliente ausente e sem acesso ao imóvel",
        "refund_percentage": 0,
        "professional_compensation_percentage": 50
      }
    ]
  }'::jsonb,
  true,
  now(),
  -- Placeholder: será atualizado com o ID do primeiro SUPER_ADMIN
  (SELECT gen_random_uuid())
);
