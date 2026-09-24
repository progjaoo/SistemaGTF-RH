# Guidelines de Frontend

## Objetivo da Interface

O frontend é uma ferramenta operacional para RH e gestoras. A prioridade é eficiência, leitura rápida, responsividade e baixa fricção em uso recorrente.

Evite aparência de landing page. Telas internas devem ser densas, organizadas e orientadas a tarefa.

## Estrutura

```text
frontend/src/
├── App.tsx
├── api.ts
├── components/
│   ├── layout/
│   ├── records/
│   └── ui/
├── hooks/
├── pages/
├── utils/
├── styles.ts
└── types.ts
```

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

Componentes específicos do portal público do colaborador:

- busca por nome (`NameSearch`);
- etapa do código de 6 dígitos (`AccessCodeStep`);
- calendário mensal com `react-day-picker` v9 + locale `date-fns/pt-BR` (`EmployeeCalendar`);
- detalhe do dia com regras hoje/atrasado/confirmado (`DayCheckin`).

Devem ser mobile-first, com botões grandes e sessão do portal em `sessionStorage` (token 8h — nunca `localStorage` permanente). A grade usa `modifiers` (`launched`, `confirmed`, `late`, `closed`), `disabled` para o futuro e `endMonth` para travar além do mês atual.

## Estilização

O projeto usa `styled-components`.

Padrões:

- styled-components específicos ficam junto do componente ou page.
- componentes genéricos ficam em `components/ui`.
- tokens globais ficam em `styles.ts`.
- não criar CSS global novo sem necessidade.

## Paleta

Tokens principais:

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
