# Guidelines de Backend

## Objetivo

O backend é a fonte de verdade das regras críticas:

- autenticação;
- autorização;
- validação de dados;
- fechamento/reabertura de períodos;
- preservação de histórico;
- cálculo de valores.

O frontend pode ocultar ações, mas a API deve bloquear acessos indevidos.

## Estrutura

```text
backend/src/
├── config.ts
├── server.ts
├── docs/
├── lib/
├── middleware/
├── routes/
└── services/
```

## Rotas

Rotas ficam em `backend/src/routes`.

Padrões:

- um arquivo por domínio;
- usar `express.Router`;
- proteger rotas com `authenticate`;
- usar `requireRole(Role.RH)` para ações administrativas;
- validar payloads com Zod;
- envolver handlers async com `asyncHandler`.

Exemplo de domínios:

- `auth`
- `employees`
- `meal-prices`
- `meal-records`
- `employee-portal`
- `billing-periods`
- `dashboard`
- `users`

`employee-portal` é uma exceção controlada: as rotas são públicas, sem JWT, porque são autoatendimento do colaborador. Mesmo assim, devem validar entrada com Zod, retornar só dados mínimos e bloquear período fechado/data futura no backend.

## Realtime

Socket.IO é inicializado em `backend/src/realtime.ts` no mesmo servidor HTTP do Express.

Padrões:

- path: `/api/socket.io`;
- handshake administrativo exige JWT em `auth.token`;
- clientes entram em sala por período com `period:join`;
- eventos de confirmação usam `meal-confirmation:updated`.

Rotas públicas não abrem socket público. Quando o Portal do Colaborador salva um check-in via HTTP, o backend emite o evento para usuários administrativos conectados na sala do período.

## Validação

Use Zod para validar entrada.

Boas práticas:

- validar `body`, `params` e `query`;
- transformar datas explicitamente;
- rejeitar payloads incompletos;
- não confiar em tipos vindos do frontend.

## Autenticação

Autenticação usa JWT.

Regras:

- token vem no header `Authorization: Bearer ...`;
- middleware preenche usuário autenticado;
- segredo vem de `JWT_SECRET`;
- nunca versionar segredo real.

## Autorização

Papéis:

```ts
Role.RH
Role.GESTORA
```

Regras:

- `RH` administra cadastros, preços, períodos e usuários.
- `GESTORA` opera lançamentos conforme permissões.
- toda ação administrativa precisa de `requireRole(Role.RH)`.

## Erros

O `server.ts` centraliza tratamento de erros.

Padrões:

- Zod retorna `422`;
- duplicidade Prisma retorna `409`;
- registro inexistente retorna `404`;
- banco indisponível retorna `503`;
- erro inesperado retorna `500`.

Não exponha stack trace para o cliente.

## Prisma

Use o client compartilhado:

```text
backend/src/lib/prisma.ts
```

Evite instanciar `new PrismaClient()` em rotas.

Exceção: scripts de seed.

## Serviços

Regras reutilizáveis e cálculos devem ir para `services/`.

Exemplo:

```text
backend/src/services/calculations.ts
```

Use services quando a lógica:

- é compartilhada por mais de uma rota;
- envolve cálculo financeiro;
- precisa ser testável de forma isolada;
- teria muitos detalhes dentro da rota.

Regras de data compartilhadas devem ficar em `services/date-rules.ts`. A referência de "hoje" é o relógio da VPS no fuso `America/Sao_Paulo`; a VPS deve estar sincronizada por NTP. Não use data do navegador para validação crítica.

## Documentação da API

OpenAPI fica em:

```text
backend/src/docs/openapi.ts
```

Ao criar ou alterar endpoint, atualize:

- `openapi.ts`;
- `docs/API.md`;
- exemplos relevantes no README, se necessário.

## Configuração

Arquivo:

```text
backend/src/config.ts
```

Carrega:

- `.env` no diretório atual;
- `backend/.env` quando executado da raiz.

Em produção, `DATABASE_URL` deve estar definida. Fallback local só é aceitável fora de produção.

## Scripts

```bash
npm run dev
npm run build
npm start
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run seed:employees:gtf
```

## Checklist para Nova Rota

- [ ] Criar rota no domínio correto.
- [ ] Adicionar autenticação.
- [ ] Adicionar `requireRole` se necessário.
- [ ] Validar entrada com Zod.
- [ ] Usar Prisma client compartilhado.
- [ ] Tratar regra de negócio na API.
- [ ] Atualizar OpenAPI.
- [ ] Atualizar `docs/API.md`.
- [ ] Rodar `npm run build`.
