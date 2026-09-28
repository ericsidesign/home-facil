# Home Fácil — Modelo de Dados MVP

> Documento de referência. A source of truth é o schema SQL em `supabase/migrations/`.

## Convenções

| Convenção | Regra |
|---|---|
| IDs | `UUID` gerado por `gen_random_uuid()` |
| Dinheiro | `INTEGER` em centavos (BRL). Nunca `float`/`real`/`numeric` sem escala fixa. |
| Timestamps | `TIMESTAMPTZ` (UTC no banco, conversão no app) |
| Soft delete | `deleted_at TIMESTAMPTZ NULL` onde aplicável. Dados financeiros nunca são excluídos. |
| Enums | `TEXT` com `CHECK` constraint (mais flexível que `CREATE TYPE` para migrations) |
| Naming | `snake_case` para tabelas e colunas |
| Índices | Prefixo `idx_` |
| Foreign keys | `ON DELETE` explícito em todas |
| Auditoria | Trigger automático em tabelas críticas |

---

## 1. users

**Finalidade:** Registro de autenticação. Gerenciado pelo Supabase Auth (`auth.users`). Não criamos tabela própria — usamos `auth.users.id` como FK.

| Campo | Tipo | Descrição |
|---|---|---|
| id | UUID PK | ID do Supabase Auth |
| email | TEXT | E-mail (gerenciado pelo Auth) |
| phone | TEXT | Telefone (gerenciado pelo Auth) |
| created_at | TIMESTAMPTZ | Data de criação |

> **Nota:** Roles (CUSTOMER, PROFESSIONAL, SUPPORT, ADMIN, SUPER_ADMIN) são armazenados em `user_profiles.role` e propagados via custom claims no JWT para RLS.

---

## 2. user_profiles

**Finalidade:** Dados comuns a todos os papéis. Ponte entre `auth.users` e perfis específicos.

| Campo | Tipo | Constraints | Descrição |
|---|---|---|---|
| id | UUID PK | DEFAULT gen_random_uuid() | |
| auth_user_id | UUID UNIQUE NOT NULL | FK → auth.users(id) ON DELETE CASCADE | |
| role | TEXT NOT NULL | CHECK (role IN ('CUSTOMER','PROFESSIONAL','SUPPORT','ADMIN','SUPER_ADMIN')) | Papel principal |
| full_name | TEXT NOT NULL | | Nome completo |
| display_name | TEXT | | Nome público (obrigatório para PROFESSIONAL) |
| avatar_url | TEXT | | URL da foto de perfil |
| phone_verified | BOOLEAN NOT NULL | DEFAULT false | |
| email_verified | BOOLEAN NOT NULL | DEFAULT false | |
| is_active | BOOLEAN NOT NULL | DEFAULT true | |
| created_at | TIMESTAMPTZ NOT NULL | DEFAULT now() | |
| updated_at | TIMESTAMPTZ NOT NULL | DEFAULT now() | |
| deleted_at | TIMESTAMPTZ | | Soft delete |

**Índices:** `idx_user_profiles_auth_user_id`, `idx_user_profiles_role`
**Exclusão:** Soft delete. Dados financeiros vinculados nunca são apagados.

---

## 3. customer_profiles

**Finalidade:** Dados específicos do cliente.

| Campo | Tipo | Constraints | Descrição |
|---|---|---|---|
| id | UUID PK | DEFAULT gen_random_uuid() | |
| user_profile_id | UUID UNIQUE NOT NULL | FK → user_profiles(id) ON DELETE CASCADE | |
| cpf_hash | TEXT | | Hash do CPF (coletado quando necessário) |
| cpf_last_four | TEXT | CHECK (length = 4) | Últimos 4 dígitos para exibição |
| preferred_contact_method | TEXT | DEFAULT 'app' | |
| notes | TEXT | | Observações internas |
| created_at | TIMESTAMPTZ NOT NULL | DEFAULT now() | |
| updated_at | TIMESTAMPTZ NOT NULL | DEFAULT now() | |

**Índices:** `idx_customer_profiles_user_profile_id`
**LGPD:** CPF armazenado como hash + últimos 4. Finalidade: pagamento, nota fiscal, prevenção a fraude.

---

## 4. professional_profiles

**Finalidade:** Dados específicos do profissional. Contém dados sensíveis com acesso restrito.

| Campo | Tipo | Constraints | Descrição |
|---|---|---|---|
| id | UUID PK | DEFAULT gen_random_uuid() | |
| user_profile_id | UUID UNIQUE NOT NULL | FK → user_profiles(id) ON DELETE CASCADE | |
| cpf_encrypted | TEXT | | CPF criptografado (vault) |
| cpf_last_four | TEXT | CHECK (length = 4) | Últimos 4 para exibição interna |
| date_of_birth | DATE | | |
| bio | TEXT | | Apresentação profissional |
| experience_description | TEXT | | Experiência |
| experience_years | SMALLINT | CHECK (>= 0) | Anos de experiência |
| verification_status | TEXT NOT NULL | DEFAULT 'DRAFT', CHECK IN ('DRAFT','PENDING_VERIFICATION','UNDER_REVIEW','APPROVED','REJECTED','SUSPENDED','BLOCKED') | |
| verification_status_reason | TEXT | | Motivo da mudança de status |
| verification_status_changed_at | TIMESTAMPTZ | | |
| verification_status_changed_by | UUID | FK → user_profiles(id) | Admin que alterou |
| materials_provided | BOOLEAN NOT NULL | DEFAULT false | Fornece materiais |
| rating_average | NUMERIC(3,2) | DEFAULT 0.00 | Nota média (cache) |
| rating_count | INTEGER NOT NULL | DEFAULT 0 | Total de avaliações (cache) |
| completed_bookings_count | INTEGER NOT NULL | DEFAULT 0 | Total concluídos (cache) |
| is_available | BOOLEAN NOT NULL | DEFAULT true | Disponível para novas solicitações |
| payout_method | TEXT | | Método de recebimento |
| payout_details_encrypted | TEXT | | Dados de recebimento (criptografados) |
| created_at | TIMESTAMPTZ NOT NULL | DEFAULT now() | |
| updated_at | TIMESTAMPTZ NOT NULL | DEFAULT now() | |

**Índices:** `idx_professional_profiles_user_profile_id`, `idx_professional_profiles_verification_status`, `idx_professional_profiles_rating`
**Exclusão:** Soft delete via user_profiles. Dados financeiros preservados.
**LGPD:** CPF criptografado em repouso. Dados bancários criptografados. Finalidade: pagamento, obrigação legal, verificação.

---

## 5. addresses

**Finalidade:** Endereços do cliente (múltiplos). Endereço do profissional (privado, 1 principal).

| Campo | Tipo | Constraints | Descrição |
|---|---|---|---|
| id | UUID PK | DEFAULT gen_random_uuid() | |
| user_profile_id | UUID NOT NULL | FK → user_profiles(id) ON DELETE CASCADE | |
| label | TEXT | DEFAULT 'Casa' | Rótulo (Casa, Trabalho, Outro) |
| zip_code | TEXT NOT NULL | | CEP |
| street | TEXT NOT NULL | | Rua |
| number | TEXT NOT NULL | | Número |
| complement | TEXT | | Complemento |
| neighborhood | TEXT NOT NULL | | Bairro |
| city | TEXT NOT NULL | | Cidade |
| state | TEXT NOT NULL | CHECK (length = 2) | UF (2 letras) |
| reference | TEXT | | Ponto de referência |
| latitude | NUMERIC(10,7) | | |
| longitude | NUMERIC(10,7) | | |
| is_primary | BOOLEAN NOT NULL | DEFAULT false | Endereço principal |
| is_private | BOOLEAN NOT NULL | DEFAULT false | Visível apenas ao proprietário e admin |
| access_instructions | TEXT | | Instruções de acesso (proteção reforçada) |
| created_at | TIMESTAMPTZ NOT NULL | DEFAULT now() | |
| updated_at | TIMESTAMPTZ NOT NULL | DEFAULT now() | |
| deleted_at | TIMESTAMPTZ | | |

**Índices:** `idx_addresses_user_profile_id`, `idx_addresses_coordinates` (GiST ou BTREE em lat/lng)
**LGPD:** `access_instructions` com acesso restrito ao profissional confirmado. `is_private` para endereço do profissional. Retenção mínima após fim da relação.

---

## 6. professional_documents

**Finalidade:** Documentos enviados pelo profissional para verificação de identidade.

| Campo | Tipo | Constraints | Descrição |
|---|---|---|---|
| id | UUID PK | DEFAULT gen_random_uuid() | |
| professional_profile_id | UUID NOT NULL | FK → professional_profiles(id) ON DELETE CASCADE | |
| document_type | TEXT NOT NULL | CHECK IN ('CPF','RG','CNH','SELFIE','PROOF_OF_ADDRESS','OTHER') | |
| storage_path | TEXT NOT NULL | | Caminho no Storage (bucket privado) |
| file_name | TEXT NOT NULL | | Nome original |
| mime_type | TEXT NOT NULL | | |
| file_size_bytes | INTEGER | | |
| status | TEXT NOT NULL | DEFAULT 'PENDING', CHECK IN ('PENDING','APPROVED','REJECTED','EXPIRED') | |
| review_notes | TEXT | | Notas do revisor (internas) |
| reviewed_by | UUID | FK → user_profiles(id) | |
| reviewed_at | TIMESTAMPTZ | | |
| expires_at | TIMESTAMPTZ | | Validade do documento |
| created_at | TIMESTAMPTZ NOT NULL | DEFAULT now() | |
| updated_at | TIMESTAMPTZ NOT NULL | DEFAULT now() | |

**Índices:** `idx_prof_docs_professional_id`, `idx_prof_docs_status`
**LGPD:** Bucket privado com acesso apenas via signed URL temporária. Acesso: profissional dono + ADMIN/SUPER_ADMIN com permissão de revisão. Retenção conforme política aprovada. Nunca logar conteúdo de documentos.

---

## 7. identity_verifications

**Finalidade:** Registro de cada tentativa de verificação de identidade. Histórico auditável.

| Campo | Tipo | Constraints | Descrição |
|---|---|---|---|
| id | UUID PK | DEFAULT gen_random_uuid() | |
| professional_profile_id | UUID NOT NULL | FK → professional_profiles(id) ON DELETE CASCADE | |
| provider | TEXT NOT NULL | DEFAULT 'MANUAL' | KYCProvider usado |
| provider_reference | TEXT | | ID externo do provedor |
| status | TEXT NOT NULL | CHECK IN ('PENDING','IN_PROGRESS','APPROVED','REJECTED','EXPIRED','ERROR') | |
| rejection_reason | TEXT | | Motivo de rejeição |
| reviewed_by | UUID | FK → user_profiles(id) | Admin revisor (se manual) |
| reviewed_at | TIMESTAMPTZ | | |
| provider_response | JSONB | | Resposta do provedor (sem dados sensíveis) |
| attempt_number | SMALLINT NOT NULL | DEFAULT 1 | Número da tentativa |
| created_at | TIMESTAMPTZ NOT NULL | DEFAULT now() | |
| updated_at | TIMESTAMPTZ NOT NULL | DEFAULT now() | |

**Índices:** `idx_identity_verif_professional_id`, `idx_identity_verif_status`

---

## 8. service_categories

**Finalidade:** Categorias de serviço configuráveis pelo admin.

| Campo | Tipo | Constraints | Descrição |
|---|---|---|---|
| id | UUID PK | DEFAULT gen_random_uuid() | |
| name | TEXT NOT NULL UNIQUE | | Nome da categoria |
| slug | TEXT NOT NULL UNIQUE | | Slug para URL/API |
| description | TEXT | | Descrição |
| icon_url | TEXT | | Ícone |
| sort_order | SMALLINT NOT NULL | DEFAULT 0 | Ordem de exibição |
| is_active | BOOLEAN NOT NULL | DEFAULT true | |
| created_at | TIMESTAMPTZ NOT NULL | DEFAULT now() | |
| updated_at | TIMESTAMPTZ NOT NULL | DEFAULT now() | |

---

## 9. services

**Finalidade:** Serviços oferecidos na plataforma, configuráveis pelo admin.

| Campo | Tipo | Constraints | Descrição |
|---|---|---|---|
| id | UUID PK | DEFAULT gen_random_uuid() | |
| category_id | UUID NOT NULL | FK → service_categories(id) ON DELETE RESTRICT | |
| name | TEXT NOT NULL | | Nome do serviço |
| slug | TEXT NOT NULL UNIQUE | | |
| description | TEXT | | Descrição pública |
| included_items | JSONB NOT NULL | DEFAULT '[]' | O que está incluído |
| excluded_items | JSONB NOT NULL | DEFAULT '[]' | O que NÃO está incluído |
| estimated_duration_minutes | INTEGER NOT NULL | | Duração-base estimada |
| max_area_sqm | INTEGER | | Limite de metragem recomendado |
| photo_urls | JSONB | DEFAULT '[]' | Fotos ilustrativas |
| client_instructions | TEXT | | Instruções ao cliente |
| materials_rules | TEXT | | Regras de materiais e equipamentos |
| is_active | BOOLEAN NOT NULL | DEFAULT true | |
| sort_order | SMALLINT NOT NULL | DEFAULT 0 | |
| created_at | TIMESTAMPTZ NOT NULL | DEFAULT now() | |
| updated_at | TIMESTAMPTZ NOT NULL | DEFAULT now() | |

**Índices:** `idx_services_category_id`, `idx_services_slug`

---

## 10. service_addons

**Finalidade:** Adicionais configuráveis por serviço.

| Campo | Tipo | Constraints | Descrição |
|---|---|---|---|
| id | UUID PK | DEFAULT gen_random_uuid() | |
| name | TEXT NOT NULL | | Nome do adicional |
| slug | TEXT NOT NULL UNIQUE | | |
| description | TEXT | | |
| estimated_duration_minutes | INTEGER NOT NULL | DEFAULT 0 | Duração extra |
| is_active | BOOLEAN NOT NULL | DEFAULT true | |
| sort_order | SMALLINT NOT NULL | DEFAULT 0 | |
| created_at | TIMESTAMPTZ NOT NULL | DEFAULT now() | |
| updated_at | TIMESTAMPTZ NOT NULL | DEFAULT now() | |

---

## 11. service_addon_links

**Finalidade:** Vincula adicionais compatíveis a serviços.

| Campo | Tipo | Constraints | Descrição |
|---|---|---|---|
| service_id | UUID NOT NULL | FK → services(id) ON DELETE CASCADE | |
| addon_id | UUID NOT NULL | FK → service_addons(id) ON DELETE CASCADE | |
| is_default | BOOLEAN NOT NULL | DEFAULT false | Pré-selecionado |
| PRIMARY KEY | (service_id, addon_id) | | |

---

## 12. professional_services

**Finalidade:** Serviços oferecidos por cada profissional, com preço customizado (HYBRID).

| Campo | Tipo | Constraints | Descrição |
|---|---|---|---|
| id | UUID PK | DEFAULT gen_random_uuid() | |
| professional_profile_id | UUID NOT NULL | FK → professional_profiles(id) ON DELETE CASCADE | |
| service_id | UUID NOT NULL | FK → services(id) ON DELETE RESTRICT | |
| is_active | BOOLEAN NOT NULL | DEFAULT true | |
| custom_price_cents | INTEGER | CHECK (>= 0) | Preço customizado (NULL = usar regra da plataforma) |
| custom_duration_minutes | INTEGER | CHECK (> 0) | Duração customizada |
| notes | TEXT | | Notas do profissional |
| created_at | TIMESTAMPTZ NOT NULL | DEFAULT now() | |
| updated_at | TIMESTAMPTZ NOT NULL | DEFAULT now() | |
| UNIQUE | (professional_profile_id, service_id) | | Um registro por par |

**Índices:** `idx_prof_services_professional_id`, `idx_prof_services_service_id`

---

## 13. service_areas

**Finalidade:** Regiões atendidas pelo profissional.

| Campo | Tipo | Constraints | Descrição |
|---|---|---|---|
| id | UUID PK | DEFAULT gen_random_uuid() | |
| professional_profile_id | UUID NOT NULL | FK → professional_profiles(id) ON DELETE CASCADE | |
| city | TEXT NOT NULL | | Cidade |
| state | TEXT NOT NULL | CHECK (length = 2) | UF |
| neighborhoods | JSONB | DEFAULT '[]' | Bairros específicos (vazio = toda a cidade) |
| max_distance_km | NUMERIC(6,2) | | Distância máxima |
| is_active | BOOLEAN NOT NULL | DEFAULT true | |
| created_at | TIMESTAMPTZ NOT NULL | DEFAULT now() | |
| updated_at | TIMESTAMPTZ NOT NULL | DEFAULT now() | |

**Índices:** `idx_service_areas_professional_id`, `idx_service_areas_city_state`

---

## 14. availability_rules

**Finalidade:** Horários regulares de disponibilidade do profissional.

| Campo | Tipo | Constraints | Descrição |
|---|---|---|---|
| id | UUID PK | DEFAULT gen_random_uuid() | |
| professional_profile_id | UUID NOT NULL | FK → professional_profiles(id) ON DELETE CASCADE | |
| day_of_week | SMALLINT NOT NULL | CHECK (0-6, 0=domingo) | Dia da semana |
| start_time | TIME NOT NULL | | Hora de início |
| end_time | TIME NOT NULL | | Hora de fim |
| is_active | BOOLEAN NOT NULL | DEFAULT true | |
| created_at | TIMESTAMPTZ NOT NULL | DEFAULT now() | |
| updated_at | TIMESTAMPTZ NOT NULL | DEFAULT now() | |
| CHECK | (end_time > start_time) | | |

**Índices:** `idx_avail_rules_professional_id`

---

## 15. availability_exceptions

**Finalidade:** Bloqueios e exceções pontuais na agenda.

| Campo | Tipo | Constraints | Descrição |
|---|---|---|---|
| id | UUID PK | DEFAULT gen_random_uuid() | |
| professional_profile_id | UUID NOT NULL | FK → professional_profiles(id) ON DELETE CASCADE | |
| exception_date | DATE NOT NULL | | Data da exceção |
| start_time | TIME | | NULL = dia inteiro bloqueado |
| end_time | TIME | | |
| reason | TEXT | | Motivo (privado) |
| is_available | BOOLEAN NOT NULL | DEFAULT false | false = bloqueio, true = disponível extra |
| created_at | TIMESTAMPTZ NOT NULL | DEFAULT now() | |

**Índices:** `idx_avail_exceptions_professional_date`

---

## 16. pricing_rules

**Finalidade:** Regras de precificação da plataforma por serviço/região.

| Campo | Tipo | Constraints | Descrição |
|---|---|---|---|
| id | UUID PK | DEFAULT gen_random_uuid() | |
| service_id | UUID NOT NULL | FK → services(id) ON DELETE RESTRICT | |
| region_state | TEXT | | NULL = todas as regiões |
| region_city | TEXT | | NULL = todas as cidades do estado |
| strategy | TEXT NOT NULL | DEFAULT 'HYBRID', CHECK IN ('PLATFORM_FIXED','PROFESSIONAL_DEFINED','HYBRID') | |
| base_price_cents | INTEGER NOT NULL | CHECK (>= 0) | Preço-base em centavos |
| min_price_cents | INTEGER NOT NULL | CHECK (>= 0) | Preço mínimo permitido |
| max_price_cents | INTEGER NOT NULL | CHECK (> 0) | Preço máximo permitido |
| area_bracket_rules | JSONB NOT NULL | DEFAULT '[]' | Regras por faixa de metragem |
| bedroom_price_cents | INTEGER NOT NULL | DEFAULT 0 | Adicional por quarto extra |
| bathroom_price_cents | INTEGER NOT NULL | DEFAULT 0 | Adicional por banheiro extra |
| addon_prices | JSONB NOT NULL | DEFAULT '{}' | Preço por addon_id em centavos |
| materials_fee_cents | INTEGER NOT NULL | DEFAULT 0 | Taxa de fornecimento de materiais |
| time_multiplier_rules | JSONB | DEFAULT '{}' | Multiplicadores por horário/dia |
| is_active | BOOLEAN NOT NULL | DEFAULT true | |
| effective_from | TIMESTAMPTZ NOT NULL | DEFAULT now() | Vigência |
| effective_until | TIMESTAMPTZ | | NULL = sem fim |
| version | INTEGER NOT NULL | DEFAULT 1 | Versionamento |
| created_at | TIMESTAMPTZ NOT NULL | DEFAULT now() | |
| updated_at | TIMESTAMPTZ NOT NULL | DEFAULT now() | |
| CHECK | (max_price_cents >= min_price_cents) | | |
| CHECK | (base_price_cents BETWEEN min_price_cents AND max_price_cents) | | |

**Índices:** `idx_pricing_rules_service_region`, `idx_pricing_rules_effective`

---

## 17. price_quotes

**Finalidade:** Cotação versionada e temporária, calculada pelo PricingEngine.

| Campo | Tipo | Constraints | Descrição |
|---|---|---|---|
| id | UUID PK | DEFAULT gen_random_uuid() | |
| customer_profile_id | UUID NOT NULL | FK → customer_profiles(id) | |
| professional_profile_id | UUID NOT NULL | FK → professional_profiles(id) | |
| service_id | UUID NOT NULL | FK → services(id) | |
| pricing_rule_id | UUID NOT NULL | FK → pricing_rules(id) | Regra utilizada |
| version | INTEGER NOT NULL | DEFAULT 1 | |
| status | TEXT NOT NULL | DEFAULT 'ACTIVE', CHECK IN ('ACTIVE','EXPIRED','USED','CANCELLED') | |
| base_price_cents | INTEGER NOT NULL | | Preço-base aplicado |
| area_adjustment_cents | INTEGER NOT NULL | DEFAULT 0 | Ajuste por metragem |
| bedroom_adjustment_cents | INTEGER NOT NULL | DEFAULT 0 | |
| bathroom_adjustment_cents | INTEGER NOT NULL | DEFAULT 0 | |
| addons_total_cents | INTEGER NOT NULL | DEFAULT 0 | Total adicionais |
| materials_fee_cents | INTEGER NOT NULL | DEFAULT 0 | |
| time_adjustment_cents | INTEGER NOT NULL | DEFAULT 0 | Ajuste horário/dia |
| professional_adjustment_cents | INTEGER NOT NULL | DEFAULT 0 | Ajuste do profissional (HYBRID) |
| discount_cents | INTEGER NOT NULL | DEFAULT 0 | Desconto (cupom futuro) |
| subtotal_cents | INTEGER NOT NULL | | Antes de taxas |
| platform_fee_percentage | NUMERIC(5,2) NOT NULL | | Comissão % vigente |
| platform_fee_cents | INTEGER NOT NULL | | Comissão calculada |
| total_cents | INTEGER NOT NULL | | Total cobrado do cliente |
| professional_net_cents | INTEGER NOT NULL | | Valor líquido do profissional |
| currency | TEXT NOT NULL | DEFAULT 'BRL' | |
| components | JSONB NOT NULL | | Detalhamento completo dos componentes |
| property_details | JSONB NOT NULL | | Snapshot das características do imóvel |
| selected_addons | JSONB NOT NULL | DEFAULT '[]' | Adicionais selecionados |
| scheduled_date | DATE NOT NULL | | Data agendada |
| scheduled_start_time | TIME NOT NULL | | |
| estimated_duration_minutes | INTEGER NOT NULL | | Duração estimada total |
| expires_at | TIMESTAMPTZ NOT NULL | | Validade da cotação |
| created_at | TIMESTAMPTZ NOT NULL | DEFAULT now() | |

**Índices:** `idx_price_quotes_customer`, `idx_price_quotes_professional`, `idx_price_quotes_status_expires`
**Exclusão:** Nunca excluir. Dados financeiros de referência.

---

## 18. bookings

**Finalidade:** Agendamento de serviço. Entidade central do marketplace.

| Campo | Tipo | Constraints | Descrição |
|---|---|---|---|
| id | UUID PK | DEFAULT gen_random_uuid() | |
| booking_number | TEXT NOT NULL UNIQUE | | Número legível (ex: HF-20250922-XXXX) |
| customer_profile_id | UUID NOT NULL | FK → customer_profiles(id) | |
| professional_profile_id | UUID NOT NULL | FK → professional_profiles(id) | |
| service_id | UUID NOT NULL | FK → services(id) | |
| address_id | UUID NOT NULL | FK → addresses(id) | |
| price_quote_id | UUID NOT NULL | FK → price_quotes(id) | Cotação utilizada |
| status | TEXT NOT NULL | DEFAULT 'DRAFT', CHECK IN (17 estados) | |
| scheduled_date | DATE NOT NULL | | |
| scheduled_start_time | TIME NOT NULL | | |
| estimated_duration_minutes | INTEGER NOT NULL | | |
| actual_start_time | TIMESTAMPTZ | | Início real |
| actual_end_time | TIMESTAMPTZ | | Fim real |
| property_type | TEXT NOT NULL | | Tipo de imóvel |
| area_bracket | TEXT NOT NULL | | Faixa de metragem |
| bedrooms | SMALLINT NOT NULL | | Quartos |
| bathrooms | SMALLINT NOT NULL | | Banheiros |
| has_outdoor_area | BOOLEAN NOT NULL | DEFAULT false | |
| has_stairs | BOOLEAN NOT NULL | DEFAULT false | |
| has_pets | BOOLEAN NOT NULL | DEFAULT false | |
| pet_details | TEXT | | |
| needs_parking | BOOLEAN NOT NULL | DEFAULT false | |
| needs_condo_authorization | BOOLEAN NOT NULL | DEFAULT false | |
| client_present | BOOLEAN | | |
| access_instructions_encrypted | TEXT | | Criptografado, acesso restrito |
| special_notes | TEXT | | |
| materials_provided_by | TEXT NOT NULL | CHECK IN ('CLIENT','PROFESSIONAL') | |
| cancellation_policy_snapshot | JSONB NOT NULL | | Snapshot da política vigente |
| price_snapshot | JSONB NOT NULL | | Snapshot completo do preço |
| gross_amount_cents | INTEGER NOT NULL | | Total cobrado |
| platform_fee_cents | INTEGER NOT NULL | | Comissão |
| professional_net_cents | INTEGER NOT NULL | | Líquido profissional |
| tip_amount_cents | INTEGER NOT NULL | DEFAULT 0 | Gorjeta (reservado V1) |
| currency | TEXT NOT NULL | DEFAULT 'BRL' | |
| professional_accepted_at | TIMESTAMPTZ | | |
| professional_rejection_reason | TEXT | | |
| accept_expires_at | TIMESTAMPTZ | | Prazo para aceite |
| checked_in_at | TIMESTAMPTZ | | |
| checked_out_at | TIMESTAMPTZ | | |
| completed_at | TIMESTAMPTZ | | |
| cancelled_at | TIMESTAMPTZ | | |
| cancelled_by | UUID | FK → user_profiles(id) | |
| cancellation_reason | TEXT | | |
| auto_completed_at | TIMESTAMPTZ | | Encerramento automático |
| created_at | TIMESTAMPTZ NOT NULL | DEFAULT now() | |
| updated_at | TIMESTAMPTZ NOT NULL | DEFAULT now() | |

**Índices:** `idx_bookings_customer`, `idx_bookings_professional`, `idx_bookings_status`, `idx_bookings_scheduled_date`, `idx_bookings_number`
**Exclusão:** Nunca excluir. Registro financeiro e legal.

---

## 19. booking_items

**Finalidade:** Itens do booking (adicionais selecionados).

| Campo | Tipo | Constraints | Descrição |
|---|---|---|---|
| id | UUID PK | DEFAULT gen_random_uuid() | |
| booking_id | UUID NOT NULL | FK → bookings(id) ON DELETE CASCADE | |
| addon_id | UUID | FK → service_addons(id) | |
| item_type | TEXT NOT NULL | CHECK IN ('SERVICE','ADDON','MATERIALS_FEE') | |
| name | TEXT NOT NULL | | Nome no momento da contratação |
| quantity | SMALLINT NOT NULL | DEFAULT 1 | |
| unit_price_cents | INTEGER NOT NULL | | Preço unitário |
| total_price_cents | INTEGER NOT NULL | | Preço total |
| created_at | TIMESTAMPTZ NOT NULL | DEFAULT now() | |

---

## 20. booking_status_history

**Finalidade:** Histórico imutável de transições de estado do booking.

| Campo | Tipo | Constraints | Descrição |
|---|---|---|---|
| id | UUID PK | DEFAULT gen_random_uuid() | |
| booking_id | UUID NOT NULL | FK → bookings(id) ON DELETE CASCADE | |
| from_status | TEXT | | NULL para criação |
| to_status | TEXT NOT NULL | | |
| changed_by | UUID | FK → user_profiles(id) | NULL para sistema |
| changed_by_role | TEXT | | Papel no momento |
| reason | TEXT | | Motivo da transição |
| metadata | JSONB | DEFAULT '{}' | Dados extras (ex: valores financeiros) |
| ip_address | INET | | |
| created_at | TIMESTAMPTZ NOT NULL | DEFAULT now() | |

**Índices:** `idx_booking_history_booking_id`
**Exclusão:** Nunca excluir. Registro de auditoria.

---

## 21. payments

**Finalidade:** Pagamento vinculado a um booking.

| Campo | Tipo | Constraints | Descrição |
|---|---|---|---|
| id | UUID PK | DEFAULT gen_random_uuid() | |
| booking_id | UUID NOT NULL | FK → bookings(id) | |
| customer_profile_id | UUID NOT NULL | FK → customer_profiles(id) | |
| provider | TEXT NOT NULL | | Provedor (abstração) |
| provider_payment_id | TEXT UNIQUE | | ID externo |
| idempotency_key | TEXT NOT NULL UNIQUE | | Chave de idempotência |
| status | TEXT NOT NULL | DEFAULT 'PENDING', CHECK IN ('PENDING','PROCESSING','AUTHORIZED','CAPTURED','FAILED','CANCELLED','REFUND_PENDING','PARTIALLY_REFUNDED','REFUNDED') | |
| method | TEXT | | Método (card, pix, boleto) |
| gross_amount_cents | INTEGER NOT NULL | | |
| currency | TEXT NOT NULL | DEFAULT 'BRL' | |
| provider_fee_cents | INTEGER | | Taxa do provedor |
| metadata | JSONB | DEFAULT '{}' | |
| paid_at | TIMESTAMPTZ | | |
| failed_at | TIMESTAMPTZ | | |
| failure_reason | TEXT | | |
| created_at | TIMESTAMPTZ NOT NULL | DEFAULT now() | |
| updated_at | TIMESTAMPTZ NOT NULL | DEFAULT now() | |

**Índices:** `idx_payments_booking_id`, `idx_payments_provider_id`, `idx_payments_status`, `idx_payments_idempotency`
**Exclusão:** Nunca excluir.

---

## 22. payment_transactions

**Finalidade:** Cada operação individual do provedor de pagamento (tentativas, webhooks).

| Campo | Tipo | Constraints | Descrição |
|---|---|---|---|
| id | UUID PK | DEFAULT gen_random_uuid() | |
| payment_id | UUID NOT NULL | FK → payments(id) | |
| type | TEXT NOT NULL | CHECK IN ('AUTHORIZATION','CAPTURE','CANCELLATION','REFUND','CHARGEBACK','WEBHOOK') | |
| provider_transaction_id | TEXT | | |
| idempotency_key | TEXT UNIQUE | | |
| status | TEXT NOT NULL | | |
| amount_cents | INTEGER NOT NULL | | |
| provider_response | JSONB | | Resposta (sem dados sensíveis) |
| created_at | TIMESTAMPTZ NOT NULL | DEFAULT now() | |

**Índices:** `idx_pay_transactions_payment_id`, `idx_pay_transactions_idempotency`

---

## 23. ledger_entries

**Finalidade:** Partidas contábeis auditáveis. Fonte de verdade financeira.

| Campo | Tipo | Constraints | Descrição |
|---|---|---|---|
| id | UUID PK | DEFAULT gen_random_uuid() | |
| booking_id | UUID | FK → bookings(id) | |
| payment_id | UUID | FK → payments(id) | |
| payout_id | UUID | FK → payouts(id) | |
| entry_type | TEXT NOT NULL | CHECK IN ('BOOKING_PAYMENT','PLATFORM_FEE','PROCESSING_FEE','PROFESSIONAL_CREDIT','TIP_CREDIT','REFUND','CHARGEBACK','PAYOUT','ADJUSTMENT') | |
| direction | TEXT NOT NULL | CHECK IN ('CREDIT','DEBIT') | |
| amount_cents | INTEGER NOT NULL | CHECK (> 0) | Sempre positivo, direção indica sinal |
| currency | TEXT NOT NULL | DEFAULT 'BRL' | |
| reference_type | TEXT | | Tipo de referência externa |
| reference_id | TEXT | | ID de referência |
| description | TEXT NOT NULL | | |
| professional_profile_id | UUID | FK → professional_profiles(id) | |
| idempotency_key | TEXT NOT NULL UNIQUE | | |
| metadata | JSONB | DEFAULT '{}' | |
| created_at | TIMESTAMPTZ NOT NULL | DEFAULT now() | |

**Índices:** `idx_ledger_booking`, `idx_ledger_professional`, `idx_ledger_type`, `idx_ledger_idempotency`
**Exclusão:** NUNCA excluir. Append-only.

---

## 24. payouts

**Finalidade:** Repasse de valores ao profissional.

| Campo | Tipo | Constraints | Descrição |
|---|---|---|---|
| id | UUID PK | DEFAULT gen_random_uuid() | |
| professional_profile_id | UUID NOT NULL | FK → professional_profiles(id) | |
| provider | TEXT NOT NULL | | |
| provider_payout_id | TEXT UNIQUE | | |
| idempotency_key | TEXT NOT NULL UNIQUE | | |
| status | TEXT NOT NULL | DEFAULT 'PENDING', CHECK IN ('PENDING','PROCESSING','COMPLETED','FAILED','CANCELLED') | |
| amount_cents | INTEGER NOT NULL | CHECK (> 0) | |
| currency | TEXT NOT NULL | DEFAULT 'BRL' | |
| period_start | DATE | | Período coberto |
| period_end | DATE | | |
| booking_ids | UUID[] | | Bookings incluídos |
| failure_reason | TEXT | | |
| paid_at | TIMESTAMPTZ | | |
| created_at | TIMESTAMPTZ NOT NULL | DEFAULT now() | |
| updated_at | TIMESTAMPTZ NOT NULL | DEFAULT now() | |

**Índices:** `idx_payouts_professional`, `idx_payouts_status`, `idx_payouts_idempotency`

---

## 25. refunds

**Finalidade:** Reembolsos processados.

| Campo | Tipo | Constraints | Descrição |
|---|---|---|---|
| id | UUID PK | DEFAULT gen_random_uuid() | |
| payment_id | UUID NOT NULL | FK → payments(id) | |
| booking_id | UUID NOT NULL | FK → bookings(id) | |
| idempotency_key | TEXT NOT NULL UNIQUE | | |
| type | TEXT NOT NULL | CHECK IN ('FULL','PARTIAL') | |
| reason | TEXT NOT NULL | | |
| amount_cents | INTEGER NOT NULL | CHECK (> 0) | |
| currency | TEXT NOT NULL | DEFAULT 'BRL' | |
| status | TEXT NOT NULL | DEFAULT 'PENDING', CHECK IN ('PENDING','PROCESSING','COMPLETED','FAILED') | |
| provider_refund_id | TEXT | | |
| initiated_by | UUID NOT NULL | FK → user_profiles(id) | |
| approved_by | UUID | FK → user_profiles(id) | |
| processed_at | TIMESTAMPTZ | | |
| created_at | TIMESTAMPTZ NOT NULL | DEFAULT now() | |
| updated_at | TIMESTAMPTZ NOT NULL | DEFAULT now() | |

**Índices:** `idx_refunds_payment`, `idx_refunds_booking`, `idx_refunds_idempotency`

---

## 26. reviews

**Finalidade:** Avaliações de bookings concluídos.

| Campo | Tipo | Constraints | Descrição |
|---|---|---|---|
| id | UUID PK | DEFAULT gen_random_uuid() | |
| booking_id | UUID NOT NULL UNIQUE | FK → bookings(id) | Uma por booking |
| customer_profile_id | UUID NOT NULL | FK → customer_profiles(id) | |
| professional_profile_id | UUID NOT NULL | FK → professional_profiles(id) | |
| overall_rating | SMALLINT NOT NULL | CHECK (1-5) | Nota geral |
| quality_rating | SMALLINT | CHECK (1-5) | Qualidade |
| punctuality_rating | SMALLINT | CHECK (1-5) | Pontualidade |
| care_rating | SMALLINT | CHECK (1-5) | Cuidado |
| communication_rating | SMALLINT | CHECK (1-5) | Comunicação |
| comment | TEXT | | Comentário |
| is_visible | BOOLEAN NOT NULL | DEFAULT true | Visibilidade |
| moderation_status | TEXT NOT NULL | DEFAULT 'ACTIVE', CHECK IN ('ACTIVE','HIDDEN','FLAGGED') | |
| moderation_reason | TEXT | | |
| moderated_by | UUID | FK → user_profiles(id) | |
| moderated_at | TIMESTAMPTZ | | |
| original_comment | TEXT | | Preservar original se moderado |
| created_at | TIMESTAMPTZ NOT NULL | DEFAULT now() | |
| updated_at | TIMESTAMPTZ NOT NULL | DEFAULT now() | |

**Índices:** `idx_reviews_professional`, `idx_reviews_customer`, `idx_reviews_booking`
**Regras:** Impedir autoavaliação (customer ≠ professional.user), booking deve estar COMPLETED, uma review por booking.

---

## 27. favorites

**Finalidade:** Profissionais favoritos do cliente.

| Campo | Tipo | Constraints | Descrição |
|---|---|---|---|
| id | UUID PK | DEFAULT gen_random_uuid() | |
| customer_profile_id | UUID NOT NULL | FK → customer_profiles(id) ON DELETE CASCADE | |
| professional_profile_id | UUID NOT NULL | FK → professional_profiles(id) ON DELETE CASCADE | |
| created_at | TIMESTAMPTZ NOT NULL | DEFAULT now() | |
| UNIQUE | (customer_profile_id, professional_profile_id) | | |

---

## 28. notifications

**Finalidade:** Notificações do sistema para os usuários.

| Campo | Tipo | Constraints | Descrição |
|---|---|---|---|
| id | UUID PK | DEFAULT gen_random_uuid() | |
| user_profile_id | UUID NOT NULL | FK → user_profiles(id) ON DELETE CASCADE | |
| type | TEXT NOT NULL | | Tipo de notificação |
| title | TEXT NOT NULL | | |
| body | TEXT NOT NULL | | |
| data | JSONB | DEFAULT '{}' | Dados extras (booking_id, etc.) |
| channel | TEXT NOT NULL | DEFAULT 'IN_APP', CHECK IN ('IN_APP','PUSH','SMS','EMAIL') | |
| is_read | BOOLEAN NOT NULL | DEFAULT false | |
| read_at | TIMESTAMPTZ | | |
| sent_at | TIMESTAMPTZ | | |
| delivery_status | TEXT | DEFAULT 'PENDING' | |
| created_at | TIMESTAMPTZ NOT NULL | DEFAULT now() | |

**Índices:** `idx_notifications_user_unread`, `idx_notifications_type`

---

## 29. support_tickets

**Finalidade:** Chamados de suporte.

| Campo | Tipo | Constraints | Descrição |
|---|---|---|---|
| id | UUID PK | DEFAULT gen_random_uuid() | |
| ticket_number | TEXT NOT NULL UNIQUE | | Número legível |
| booking_id | UUID | FK → bookings(id) | |
| created_by | UUID NOT NULL | FK → user_profiles(id) | |
| assigned_to | UUID | FK → user_profiles(id) | Agente de suporte |
| category | TEXT NOT NULL | | |
| subject | TEXT NOT NULL | | |
| description | TEXT NOT NULL | | |
| priority | TEXT NOT NULL | DEFAULT 'MEDIUM', CHECK IN ('LOW','MEDIUM','HIGH','URGENT') | |
| status | TEXT NOT NULL | DEFAULT 'OPEN', CHECK IN ('OPEN','IN_PROGRESS','WAITING_CUSTOMER','WAITING_INTERNAL','RESOLVED','CLOSED') | |
| resolution | TEXT | | |
| resolved_at | TIMESTAMPTZ | | |
| closed_at | TIMESTAMPTZ | | |
| created_at | TIMESTAMPTZ NOT NULL | DEFAULT now() | |
| updated_at | TIMESTAMPTZ NOT NULL | DEFAULT now() | |

**Índices:** `idx_tickets_created_by`, `idx_tickets_booking`, `idx_tickets_status`

---

## 30. disputes

**Finalidade:** Disputas financeiras ou de serviço.

| Campo | Tipo | Constraints | Descrição |
|---|---|---|---|
| id | UUID PK | DEFAULT gen_random_uuid() | |
| booking_id | UUID NOT NULL | FK → bookings(id) | |
| opened_by | UUID NOT NULL | FK → user_profiles(id) | |
| assigned_to | UUID | FK → user_profiles(id) | |
| type | TEXT NOT NULL | CHECK IN ('NO_SHOW_PROFESSIONAL','NO_SHOW_CUSTOMER','LATE_ARRIVAL','SERVICE_QUALITY','BEHAVIOR','DAMAGE','PAYMENT','OTHER') | |
| description | TEXT NOT NULL | | |
| status | TEXT NOT NULL | DEFAULT 'OPEN', CHECK IN ('OPEN','UNDER_REVIEW','AWAITING_EVIDENCE','RESOLVED_CUSTOMER','RESOLVED_PROFESSIONAL','RESOLVED_PARTIAL','CLOSED') | |
| resolution | TEXT | | |
| resolution_amount_cents | INTEGER | | Valor do ajuste |
| evidence_urls | JSONB | DEFAULT '[]' | URLs de evidências (storage privado) |
| blocks_payout | BOOLEAN NOT NULL | DEFAULT true | Bloqueia liberação do valor |
| resolved_by | UUID | FK → user_profiles(id) | |
| resolved_at | TIMESTAMPTZ | | |
| created_at | TIMESTAMPTZ NOT NULL | DEFAULT now() | |
| updated_at | TIMESTAMPTZ NOT NULL | DEFAULT now() | |

**Índices:** `idx_disputes_booking`, `idx_disputes_status`

---

## 31. cancellation_policies

**Finalidade:** Políticas de cancelamento versionadas e configuráveis.

| Campo | Tipo | Constraints | Descrição |
|---|---|---|---|
| id | UUID PK | DEFAULT gen_random_uuid() | |
| name | TEXT NOT NULL | | |
| version | INTEGER NOT NULL | DEFAULT 1 | |
| rules | JSONB NOT NULL | | Regras por cenário |
| is_active | BOOLEAN NOT NULL | DEFAULT true | |
| effective_from | TIMESTAMPTZ NOT NULL | | |
| effective_until | TIMESTAMPTZ | | |
| created_by | UUID NOT NULL | FK → user_profiles(id) | |
| created_at | TIMESTAMPTZ NOT NULL | DEFAULT now() | |

---

## 32. platform_settings

**Finalidade:** Configurações globais da plataforma com histórico.

| Campo | Tipo | Constraints | Descrição |
|---|---|---|---|
| id | UUID PK | DEFAULT gen_random_uuid() | |
| key | TEXT NOT NULL UNIQUE | | Chave da configuração |
| value | JSONB NOT NULL | | Valor |
| description | TEXT | | |
| category | TEXT NOT NULL | DEFAULT 'general' | Agrupamento |
| is_sensitive | BOOLEAN NOT NULL | DEFAULT false | Requer SUPER_ADMIN |
| updated_by | UUID | FK → user_profiles(id) | |
| created_at | TIMESTAMPTZ NOT NULL | DEFAULT now() | |
| updated_at | TIMESTAMPTZ NOT NULL | DEFAULT now() | |

---

## 33. platform_settings_history

**Finalidade:** Histórico de alterações em configurações.

| Campo | Tipo | Constraints | Descrição |
|---|---|---|---|
| id | UUID PK | DEFAULT gen_random_uuid() | |
| setting_id | UUID NOT NULL | FK → platform_settings(id) | |
| previous_value | JSONB | | Valor anterior |
| new_value | JSONB NOT NULL | | Novo valor |
| changed_by | UUID NOT NULL | FK → user_profiles(id) | |
| reason | TEXT | | |
| created_at | TIMESTAMPTZ NOT NULL | DEFAULT now() | |

---

## 34. audit_log

**Finalidade:** Trilha de auditoria imutável para ações administrativas sensíveis.

| Campo | Tipo | Constraints | Descrição |
|---|---|---|---|
| id | UUID PK | DEFAULT gen_random_uuid() | |
| actor_id | UUID | FK → user_profiles(id) | NULL para sistema |
| actor_role | TEXT | | Papel no momento |
| action | TEXT NOT NULL | | Ação realizada |
| entity_type | TEXT NOT NULL | | Tipo da entidade |
| entity_id | UUID | | ID da entidade |
| previous_value | JSONB | | Valor anterior |
| new_value | JSONB | | Novo valor |
| ip_address | INET | | |
| user_agent | TEXT | | |
| correlation_id | UUID | | ID de correlação |
| metadata | JSONB | DEFAULT '{}' | |
| created_at | TIMESTAMPTZ NOT NULL | DEFAULT now() | |

**Índices:** `idx_audit_actor`, `idx_audit_entity`, `idx_audit_action`, `idx_audit_created`
**Exclusão:** NUNCA excluir. Append-only. Sem UPDATE.

---

## 35. user_blocks

**Finalidade:** Bloqueios entre usuários (profissional ↔ cliente).

| Campo | Tipo | Constraints | Descrição |
|---|---|---|---|
| id | UUID PK | DEFAULT gen_random_uuid() | |
| blocker_id | UUID NOT NULL | FK → user_profiles(id) ON DELETE CASCADE | |
| blocked_id | UUID NOT NULL | FK → user_profiles(id) ON DELETE CASCADE | |
| reason | TEXT | | |
| created_at | TIMESTAMPTZ NOT NULL | DEFAULT now() | |
| UNIQUE | (blocker_id, blocked_id) | | |
| CHECK | (blocker_id != blocked_id) | | |

---

## Diagrama de Relacionamentos (simplificado)

```
auth.users ──1:1── user_profiles ──1:1── customer_profiles
                                   └──1:1── professional_profiles ──1:N── professional_documents
                                                                    ├──1:N── identity_verifications
                                   └──1:N── addresses               ├──1:N── professional_services
                                                                    ├──1:N── service_areas
                                                                    ├──1:N── availability_rules
                                                                    └──1:N── availability_exceptions

service_categories ──1:N── services ──1:N── service_addon_links ──N:1── service_addons
                                     └──1:N── pricing_rules

bookings ──1:N── booking_items
         ├──1:N── booking_status_history
         ├──1:1── payments ──1:N── payment_transactions
         ├──1:N── refunds
         ├──1:1── reviews
         ├──1:N── disputes
         └──1:N── support_tickets

professional_profiles ──1:N── ledger_entries
                      └──1:N── payouts
```
