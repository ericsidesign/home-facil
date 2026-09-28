# Guia de Design — App de Limpeza Residencial

## 1. Diagnóstico

Apps do tipo "Uber da faxina" (Parafuzo e similares) costumam resolver bem a função, mas visualmente caem quase sempre no mesmo lugar: azul ou verde-água genérico, ícones de vassourinha, cards brancos com sombra cinza e botões arredondados iguais em tudo. Funciona, mas não fica na memória de ninguém — e não transmite a sensação real que o serviço entrega, que é a de **chegar em casa e sentir o ar diferente**.

O objetivo deste guia é fugir desse "azul-limpeza" padrão e construir uma identidade que remeta à sensação física de uma casa recém-limpa: luz de manhã entrando pela janela, lençol passado, cheiro de cítrico — não ao produto de limpeza em si.

## 2. Conceito central

**"Domingo de manhã."**

A ideia visual não é "limpeza" no sentido de produto de limpeza (balde, espuma, azul-piscina), e sim o *resultado* dela: uma casa em ordem, luz entrando, silêncio bom. O app deve parecer mais com um bom app de bem-estar/lifestyle do que com um app de prestação de serviço genérico — isso já diferencia de 90% da concorrência.

Isso se traduz em:
- Fundo claro e quente (não branco clínico, não azul-hospital).
- Um verde profundo de planta saudável como cor de confiança, no lugar do azul/teal batido.
- Um amarelo cítrico como acento de energia e "antes/depois".
- Fotografia real de ambientes com luz natural, nunca ilustração de vassoura ou balde.

## 3. Paleta de cores

| Token | Hex | Uso |
|---|---|---|
| `bg-linen` | `#FAF7F0` | Fundo base (quente, não branco puro) |
| `surface` | `#FFFFFF` | Cards, campos, superfícies elevadas |
| `ink` | `#1E2A22` | Texto principal (verde-preto, não preto puro) |
| `ink-muted` | `#5C685F` | Texto secundário |
| `primary-forest` | `#2E6B4F` | Cor de marca, CTAs primários, confiança |
| `primary-forest-dark` | `#1F4E39` | Hover/pressed do CTA |
| `accent-citrus` | `#E8B23F` | Destaques, badges "antes/depois", avaliações |
| `line` | `#DFD8C6` | Bordas e divisores, quente e discreto |
| `alert-coral` | `#C1573F` | Erros e cancelamentos (terroso, não vermelho-semáforo) |

Evite o cinza-neutro puro (#F5F5F5, #EEEEEE) em qualquer lugar — ele é o que faz um app parecer template. Todo neutro aqui tem uma leve base quente (bege), coerente com `bg-linen`.

## 4. Tipografia

- **Display/títulos:** Fraunces (serifada, variável, com peso e personalidade — passa acolhimento sem parecer editorial frio).
- **Corpo/UI:** Inter ou General Sans (neutra, legível, ótima em telas pequenas).

Regras:
- Títulos de tela em Fraunces, peso 500–600, sem caixa alta.
- Nunca usar all-caps para labels de categoria ("Limpeza padrão", não "LIMPEZA PADRÃO").
- Corpo de texto com no máximo ~38–42 caracteres por linha em telas mobile.
- Números de preço e horário em Inter tabular, para alinhar bem em listas.

## 5. Layout e grid

- Grid mobile de 4 colunas, margem lateral de 20px, gutter de 12px.
- Cantos: hierarquia de raio, não um raio único em tudo.
  - Cards de serviço: 20px (mais orgânico, convida ao toque)
  - Botões: 14px
  - Chips/tags: raio total (pill), só para status curtos ("Confirmado", "A caminho")
- Sombra única e discreta: `0 2px 12px rgba(30,42,34,0.08)` — nunca a sombra cinza padrão de kit de SaaS.
- Fotografia sempre com luz natural e ambientes reais, cortada em proporção 4:5, nunca em círculo.

## 6. Telas principais (wireframes)

### Home
```
┌─────────────────────────────┐
│ Bom dia, Marina        🔔   │
│ "Sua casa merece um domingo  │
│  de manhã toda semana."      │
│                               │
│ ┌───────────────────────────┐│
│ │ [foto sala com luz]       ││
│ │ Última limpeza: há 6 dias ││
│ │ Agendar de novo →         ││
│ └───────────────────────────┘│
│                               │
│  Padrão   Pesada   Passadoria│
│   🟢🟡🟢   (cards horizontais)│
│                               │
│ Profissionais perto de você  │
│ [card] [card] [card] →       │
└─────────────────────────────┘
```

### Agendamento
```
┌─────────────────────────────┐
│ ← Tipo de limpeza            │
│                               │
│ ○ Padrão                     │
│ ● Pesada                     │
│ ○ Só passar roupa            │
│                               │
│ Cômodos                      │
│ [ Quartos: 2 ] [ Banh.: 1 ]  │
│                               │
│ ─────────────────────────    │
│ Resumo             R$ 149    │
│ [   Confirmar horário   ]    │
└─────────────────────────────┘
```

### Acompanhamento do serviço (estado ao vivo)
```
┌─────────────────────────────┐
│  A caminho — chega em 12 min │
│  ●───────○───────○           │
│  Aceito  A caminho  Iniciado │
│                               │
│  [foto da profissional]      │
│  Camila • 4,9 ★ • 312 serviços│
│  [ Mensagem ]  [ Ligar ]     │
└─────────────────────────────┘
```

Esse padrão de "linha do tempo horizontal com bolinhas" só é usado aqui porque o conteúdo *é* mesmo uma sequência de status — não é decoração gratuita.

## 7. Microinterações e movimento

- Um único momento de destaque: ao concluir o serviço, a foto "depois" entra com um leve reveal (crossfade + leve zoom-out), como cortina abrindo — não fade-slide-up em cada card da tela.
- Botões e cards reagem só ao toque (scale 0.98 + sombra reduzida), nada de animação automática ao carregar a tela.
- Barra de progresso do "profissional a caminho" anima suavemente em tempo real, sem pulsar sem necessidade.

## 8. Tom de voz

- Direto, do ponto de vista de quem usa a casa, não do sistema: "Sua diarista chega em 12 min", não "Status do agendamento: em trânsito".
- Botões descrevem a ação real: "Confirmar horário", "Avaliar Camila" — nunca "Enviar" ou "OK" genéricos.
- Estado vazio (sem agendamentos): convite a agir, sem pedir desculpas — "Ainda sem limpeza marcada. Que tal domingo?"

## 9. Checklist antes de implementar

- [ ] Nenhuma cor cinza neutro puro usada — tudo com base quente ou verde
- [ ] Fotografia real (nunca ilustração de vassoura/balde/produtos)
- [ ] Um raio de canto por hierarquia de elemento, não um só para tudo
- [ ] Contraste de texto ≥ 4.5:1 em `ink` sobre `bg-linen` e `surface`
- [ ] Foco de teclado visível em todos os campos e botões
- [ ] Motion reduzido respeitado (`prefers-reduced-motion`)
