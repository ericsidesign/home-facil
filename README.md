# Home Fácil

Plataforma de contratação de serviços de limpeza e organização residencial no Brasil.

## Estrutura do Projeto

```
home-facil/
├── supabase/                  # Supabase: migrations, seed, edge functions
│   ├── migrations/            # SQL migrations versionadas
│   ├── functions/             # Edge Functions (Deno/TypeScript)
│   ├── seed.sql               # Dados iniciais
│   └── config.toml            # Configuração local Supabase
├── apps/
│   ├── mobile/                # Flutter app (Android + iOS)
│   └── admin/                 # Next.js admin panel
├── packages/
│   └── shared/                # Tipos e contratos compartilhados (TypeScript)
├── docs/                      # Documentação
│   ├── data-model.md          # Modelo de dados
│   ├── api-reference.md       # Referência de API
│   ├── lgpd.md                # Mapeamento LGPD
│   └── runbook.md             # Operação
└── README.md
```

## Stack

| Camada | Tecnologia |
|---|---|
| Banco de dados | PostgreSQL (Supabase) |
| Autenticação | Supabase Auth |
| API / Regras de negócio | Supabase Edge Functions (Deno/TypeScript) |
| Armazenamento de arquivos | Supabase Storage |
| Segurança em nível de linha | Row Level Security (RLS) |
| App mobile | Flutter + Dart |
| Painel administrativo | Next.js + TypeScript |

## Requisitos de Ambiente

- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Flutter SDK](https://flutter.dev/docs/get-started/install) ≥ 3.x
- [Node.js](https://nodejs.org/) ≥ 20
- [Deno](https://deno.land/) ≥ 1.40 (para Edge Functions locais)

## Setup

```bash
# 1. Clone o repositório
# 2. Instale Supabase CLI
npm install -g supabase

# 3. Inicie o Supabase local
cd supabase && supabase start

# 4. Aplique migrations
supabase db reset

# 5. Admin panel
cd apps/admin && npm install && npm run dev

# 6. Mobile
cd apps/mobile && flutter pub get && flutter run
```

## Licença

Proprietário — Todos os direitos reservados.
