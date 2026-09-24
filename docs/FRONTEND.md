# Guidelines de Frontend

## Objetivo da Interface

O frontend é uma ferramenta operacional para RH e gestoras. A prioridade é eficiência, leitura rápida, responsividade e baixa fricção em uso recorrente.

Evite aparência de landing page. Telas internas devem ser densas, organizadas e orientadas a tarefa.

## Estrutura

```text
frontend/src/
├── App.tsx
├── api.ts
├── main.tsx
├── index.css
├── lib/
│   └── utils.ts
├── components/
│   ├── layout/
│   ├── records/
│   ├── employee-portal/
│   └── ui/
├── hooks/
├── pages/
├── utils/
└── types.ts
```

## Estilização

O projeto usa **Tailwind CSS v4** (plugin `@tailwindcss/vite`) + **shadcn** (new-york) + **Radix**.

- Tema em `src/index.css` (`@theme`): tokens Genesis (`teal`, `gold`, `coral`, `cream`, `sky`, `paper`, `success`, `danger`, `ink`, `muted`, `line`) + fonte Outfit via `@fontsource`.
- Utilitário `cn()` em `src/lib/utils.ts` (clsx + tailwind-merge).
- Alias `@/*` → `src/*` (`vite.config.ts` + `tsconfig.json`).
- Componentes shadcn em `components/ui` (`button`, `input`, `label`, `badge`, `dialog`, `skeleton`, `checkbox`, `select`, `separator`, `sonner`).
- CSS de terceiros (react-day-picker do portal) mora em `index.css` sob `.portal-calendar`.
- styled-components foi removido: não reintroduzir.

## App

`App.tsx` deve continuar como orquestrador:

- sessão;
- carregamento de dados;
- tab ativa;
- shell/layout;
- seleção da page ativa.

Evite recolocar JSX completo de telas dentro de `App.tsx`.

## Pages

Cada módulo deve ficar em `pages/`:

- `DashboardPage`
- `RecordsPage`
- `EmployeesPage`
- `PricesPage`
- `PeriodsPage`
- `UsersPage`
- `LoginPage`
- `EmployeePortalPage`

Pages podem orquestrar dados e callbacks, mas componentes repetíveis devem ser extraídos.

`EmployeePortalPage` fica fora do `Shell` administrativo e deve abrir publicamente em `/colaborador`.

## Components

### `components/layout`

Componentes globais de estrutura:

- Shell.
- Sidebar.
- Brand.
- Topbar ou containers globais.

### `components/ui`

Componentes genéricos:

- `Button`
- `IconButton`
- `Panel`
- `DataTable`
- `Field`
- `Badge`
- `Alert`
- `Loading`
- `EmptyState`

Esses componentes devem ser reutilizados antes de criar variações novas.

### `components/records`

Componentes específicos da tela de lançamentos.

Use essa pasta para regras visuais da grade, cards de funcionário, filtros e controles de quantidade.

### `components/employee-portal`

Componentes específicos do portal público do colaborador (Tailwind, sem styled):

- busca por nome (portal);
- calendário mensal com `react-day-picker` v9 + locale `date-fns/pt-BR`;
- confirmação `Peguei` / `Não peguei`;
- etapa do código de 6 dígitos.

Sessão do portal em `sessionStorage` (turno 8h) ou `localStorage` com "manter conectado" (30d — nunca sem consentimento). Toasts de check-in via mini-`Toaster` do ramo portal no `App`.

## PWA do portal

Instalável a partir de `/colaborador/`: manifest + service worker via `vite-plugin-pwa` (`registerType: prompt`), ícones gerados do logo (`scripts/gen-pwa-icons.mjs` → `public/pwa-*.png`), API sempre `NetworkOnly` (nunca cachear lançamentos/confirmações). Botão "Instalar app" aparece quando o navegador dispara `beforeinstallprompt`. Requer HTTPS em produção (ok em `portal88.com.br`).

Devem ser mobile-first, com botões grandes (≥44px).

## Estilização

O projeto usa **Tailwind CSS v4** (plugin `@tailwindcss/vite`) + **shadcn** (new-york) + **Radix**.

Padrões:

- classes utilitárias com tokens do `@theme` (`bg-teal`, `text-ink`, `border-line`...);
- `components/ui` para primitivos (`Button`, `Input`, `Badge`, `Dialog`, `Toaster`...);
- compor com `cn()` em vez de template string condicional;
- feedback via `toast.*` (sonner); erro inline no form + toast para o global;
- `Dialog` do Radix no lugar de `window.confirm`, com foco inicial e Esc;
- `Skeleton` para loading de grades/tabelas;
- botões com `:active:scale` (já global no `index.css`).

## Sidebar (shadcn)

`components/layout/Sidebar.tsx` usa o bloco shadcn (`SidebarProvider`, `Sidebar`, `SidebarMenu/Button`, `SidebarInset`, `SidebarTrigger`, `TooltipProvider`):

- `collapsible="icon"`: expandida 280px (`--sidebar-width: 17.5rem`), recolhida 56px (`--sidebar-width-icon: 3.5rem`).
- Estado em `useSidebarCollapsed` (localStorage) ligado em `open/onOpenChange` do provider.
- Cores Genesis aplicadas no próprio `ui/sidebar.tsx` (fundo teal-ink, ativo com borda gold); sem `dark:`.
- Mobile: drawer (Sheet) via `SidebarTrigger` no Topbar.
- NUNCA colocar componente com renderização condicional de grid/flex como filho direto de grade (lição do hotfix Toaster × Shell).

## Tipografia

- Títulos: **General Sans** bold (self-hosted em `src/assets/fonts`, sem request externo) — classe `font-display`.
- Texto: **DM Sans** regular, corpo 15px (`--font-sans`, `@fontsource/dm-sans`).
- Escala: display 72 (hero do login), headline 60, seção 32 (título da Topbar), subhead 24 (títulos de painel), body 15, small 13, caption 12, overline 11.

## Toasts

`<Toaster/>` montado no `App` (3 ramos: shell, login, portal). Mapa: login/logout, salvar/importar/fechar/reabrir/CRUDs, check-in do portal (`PEGUEI` success, `NAO_PEGUEI` info). Falha de API sempre gera `toast.error` com a mensagem (nunca stack).

## Paleta

Tokens do `@theme` em `src/index.css`:

```text
teal / teal-hover / teal-deep / teal-bg
gold / gold-soft / gold-deep
coral / coral-deep
cream / sky / paper
success / danger
ink / muted / line
```

Prefira esses tokens antes de criar cores soltas. Teal é o acento dominante; gold/coral só em destaque pontual.

## Paleta (legado — ver `@theme` em `frontend/src/index.css`)

Tokens principais (era styled-components, agora Tailwind):

```text
--ink
--muted
--line
--paper
--surface
--teal
--teal-soft
--wine
--amber
--steel
--focus
--shadow
```

Prefira esses tokens antes de criar cores soltas.

## Ícones

Use `lucide-react`.

Regras:

- botões de ação devem usar ícone quando houver ícone adequado;
- ícones devem ter tamanho coerente, geralmente entre `16` e `20`;
- botões só com ícone precisam de `title` e `aria-label`.

## Responsividade

O sistema deve funcionar no navegador mobile.

Breakpoints usados com frequência:

```css
@media (max-width: 900px)
@media (max-width: 720px)
@media (max-width: 520px)
```

Cuidados:

- sidebar vira navegação compacta/mobile;
- tabelas devem aceitar overflow horizontal ou virar cards;
- textos não podem vazar de botões/cards;
- evitar altura fixa em telas com muito conteúdo;
- inputs e botões precisam ser confortáveis ao toque.
- portal do colaborador deve priorizar navegação por celular.

## Formulários

Use `Field` de `components/ui` quando possível.

Padrões:

- labels visíveis;
- `required` quando a API exige;
- `autoComplete` em login e campos conhecidos;
- erro claro com `InlineError` ou variação específica;
- botão deve mostrar estado de carregamento.

## Login

Login deve manter:

- `onLogin(email, password)`;
- estados `submitting` e `error`;
- campos controlados;
- layout institucional com logo GTF;
- texto:
  - `GTF - Recursos Humanos`
  - `Controle de Almoços`

## API Client

Chamadas ficam em:

```text
frontend/src/api.ts
```

Use `VITE_API_URL` para trocar ambiente.

Não hardcodar domínio de produção em componentes.

## Realtime

Socket.IO client fica em hooks dedicados.

Padrões:

- derivar URL/path a partir de `VITE_API_URL` via `getSocketConfig`;
- enviar token JWT no handshake;
- conectar apenas quando a tela precisa de realtime;
- desconectar no cleanup do `useEffect`.

Na tela de lançamentos, o painel "Verificar quem Pegou" escuta `meal-confirmation:updated` e atualiza a conferência aberta automaticamente.

## Utilitários

Funções puras devem ir para `utils/`:

- datas;
- moeda;
- normalização de busca;
- exportação de arquivo;
- cálculo de preço;
- montagem de relatório.

## Performance

- Não recalcular listas pesadas a cada render; use `useMemo` quando houver filtro/ordenação relevante.
- Use debounce em busca textual.
- Evite criar componentes dentro de componentes.
- Evite dependências novas para problemas pequenos.
- Reaproveite callbacks existentes quando possível.

## Build

```bash
cd frontend
npm run build
```

Em produção sob subcaminho:

```bash
VITE_API_URL=https://portal88.com.br/sistema-rh-api VITE_BASE_PATH=/sistema-rh/ npm run build
```
