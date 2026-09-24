# API REST

Base local: `http://localhost:3333/api`

Base produção: `https://portal88.com.br/sistema-rh-api`

Swagger UI: `http://localhost:3333/api/docs/`

OpenAPI JSON: `http://localhost:3333/api/docs.json`

Swagger produção: `https://portal88.com.br/sistema-rh-api/docs/`

## Convenções

- Todas as rotas ficam sob `/api` no backend.
- Em produção, Nginx remove o prefixo público `/sistema-rh-api/` e encaminha para `/api/`.
- Payloads são JSON.
- Datas devem ser enviadas em formato ISO ou `YYYY-MM-DD`, conforme o endpoint.
- A referência de "hoje" para bloqueio de lançamentos futuros é o relógio da VPS no fuso `America/Sao_Paulo`.
- Períodos futuros podem ser criados por RH; a trava de data vigente não bloqueia `BillingPeriod`.
- Rotas protegidas exigem header:

```http
Authorization: Bearer TOKEN
```

## Status HTTP

- `200`: operação concluída.
- `201`: recurso criado, quando aplicável.
- `401`: não autenticado.
- `403`: autenticado, mas sem permissão.
- `404`: recurso não encontrado.
- `409`: conflito, normalmente duplicidade.
- `422`: dados inválidos.
- `429`: limite de requisições excedido (rate-limit). Aguarde um minuto.
- `500`: erro inesperado.
- `503`: banco indisponível ou mal configurado.

## Rate-Limit

- `POST /auth/login`: 10 tentativas/min por IP. Excesso retorna `429` e gera `AuditLog` `LOGIN_RATE_LIMITED`.
- Rotas `/employee-portal/*`: 60 req/min por IP. Excesso retorna `429` com `AuditLog` `PORTAL_RATE_LIMITED`.
- Atrás do Nginx, o IP real vem do `X-Forwarded-For` (API confia apenas em proxy loopback).

## Autenticação

- `POST /auth/login`
- `GET /auth/me`

## Funcionários

- `GET /employees`
- `POST /employees` RH
- `PUT /employees/:id` RH
- `DELETE /employees/:id` RH, inativa sem apagar histórico

`POST`/`PUT` aceitam `workdays`: array de 0–6 (`0`=dom) com os dias esperados, ou `null` para seguir o `scheduleType`. Ex: `"workdays": [1,2,3,4,5,6]` (seg–sáb). O bulk usa esses dias para o aviso de jornada, sem bloquear.

## Preços

- `GET /meal-prices`
- `POST /meal-prices` RH

## Lançamentos

- `GET /meal-records?periodId=...`
- `POST /meal-records/bulk`
- `POST /meal-records/import`
- `GET /meal-records/confirmations?periodId=...&date=...`

Regras:

- `POST /meal-records/bulk` rejeita a requisição inteira com `422` se qualquer item tiver `date` maior que hoje.
- `POST /meal-records/import` aceita linhas `{ name?, employeeId?, date, quantity }`: com `dryRun: true` retorna `preview` linha a linha sem gravar; sem `dryRun`, qualquer linha inválida (nome não encontrado/ambíguo, data inválida/futura/fora do período, quantidade fora de 0–10) bloqueia tudo com `422`. Nunca cria período nem funcionário; commit gera `AuditLog` `IMPORT_PLANILHA`.
- `GET /meal-records/confirmations` é protegido por login e pode ser usado por RH e Gestora para conferir `PENDING`, `PEGUEI` e `NAO_PEGUEI`.
- `confirmationSource` pode ser `SISTEMA`, `WHATSAPP` ou `null`; `WHATSAPP` fica reservado para integração futura.
- A conferência da gestora usa Socket.IO para receber confirmações do Portal do Colaborador em tempo real quando o painel "Verificar quem Pegou" está aberto.

Exemplo de erro para data futura:

```json
{
  "message": "Existem lançamentos com data futura.",
  "invalidDates": ["2026-07-10"]
}
```

## Portal do Colaborador

Acesso por **nome + código de 6 dígitos** (código definido pelo RH em Funcionários). Sem código ativado, o portal não abre.

Rotas:

- `GET /employee-portal/search?name=...` — pública com rate-limit; retorna `id`, `name` e `hasAccess`
- `POST /employee-portal/login` — pública com rate-limit estrito (10/min); corpo `{ employeeId, code }`; retorna token de 8h
- `GET /employee-portal/:employeeId/calendar?month=YYYY-MM` — exige token do próprio funcionário
- `POST /employee-portal/:employeeId/checkin` — exige token do próprio funcionário

Regras:

- A busca retorna somente `id`, `name` e `hasAccess` de funcionários ativos.
- `calendar` e `checkin` exigem `Authorization: Bearer TOKEN_DO_PORTAL` do próprio `employeeId` (403 se divergir).
- O calendário retorna apenas dias com lançamento existente (`quantity > 0`).
- O check-in aceita apenas `PEGUEI` ou `NAO_PEGUEI`, com `note` opcional (≤500, observação do colaborador).
- Marcação em dia passado exige `note` não-vazia (422 sem justificativa); dia já confirmado retorna `409` (ajuste só pessoalmente com RH/gestora).
- Não é possível confirmar data futura.
- Não é possível confirmar lançamento de período fechado.
- A confirmação pelo portal grava `confirmationSource = SISTEMA`.
- Após salvar o check-in, a API emite o evento realtime `meal-confirmation:updated` para a sala do período.

Payload de check-in:

```json
{
  "date": "2026-07-03",
  "status": "PEGUEI"
}
```

## Períodos

- `GET /billing-periods`
- `POST /billing-periods` RH
- `POST /billing-periods/:id/close` RH
- `POST /billing-periods/:id/reopen` RH
- `GET /billing-periods/:id/report`
- `GET /billing-periods/:id/report?format=xlsx`
- `GET /billing-periods/:id/report?format=pdf`

Os três formatos derivam do mesmo cálculo (`calculatePeriodSummary`): totais idênticos nos centavos.

Observação: RH pode criar períodos futuros para planejamento. As validações permanecem em formato de data, intervalo válido (`startDate <= endDate`) e permissões.

## Gerador Anual

- `POST /billing-periods/bulk-year` RH — corpo `{ year: 2027, cutDay: 6, labelPrefix?: "GTF" }`.
- `cutDay` de 1 a 28 (padrão operacional: 6, ciclo 06→05); corte 1 = meses cheios.
- Cria os 12 mensais de forma atômica: qualquer sobreposição com período existente retorna `409` com `conflicts` e **nada é criado**.
- Para visão anual consolidada, crie um período único `01/01–31/12` no `POST /billing-periods` — fechar o ano trava o ano todo.

## Dashboard

- `GET /dashboard/summary?periodId=...`

## Socket.IO

Path local:

```text
http://localhost:3333/api/socket.io
```

Path produção:

```text
https://portal88.com.br/sistema-rh-api/socket.io
```

Eventos administrativos exigem token JWT no handshake:

```ts
io(url, {
  path,
  auth: { token }
})
```

Eventos:

- Cliente -> servidor: `period:join` com `periodId`.
- Cliente -> servidor: `period:leave` com `periodId`.
- Servidor -> cliente: `meal-confirmation:updated`.

Payload de `meal-confirmation:updated`:

```json
{
  "periodId": "uuid",
  "confirmation": {
    "employeeId": "uuid",
    "employeeName": "Ana Paula",
    "date": "2026-07-03",
    "quantity": 1,
    "confirmationStatus": "PEGUEI",
    "confirmationSource": "SISTEMA",
    "confirmedAt": "2026-07-03T14:45:20.236Z"
  }
}
```

## Usuários

- `GET /users` RH
- `POST /users` RH
- `PUT /users/:id` RH

## Códigos de Acesso ao Portal (RH)

- `PUT /employees/:id/access-code` RH — corpo opcional `{ code: "482917" }`; sem corpo, gera 6 dígitos. Retorna o código **uma única vez**.
- `DELETE /employees/:id/access-code` RH — revoga o acesso.
- `POST /employees/access-codes/batch` RH — gera para todos os ativos sem código; lista retornada **uma única vez**.

## Manutenção da Documentação

Ao criar ou alterar endpoint:

1. Atualize `backend/src/docs/openapi.ts`.
2. Atualize este arquivo.
3. Confirme no Swagger local:

```text
http://localhost:3333/api/docs/
```

## Regras de Acesso

Rotas com indicação `RH` devem ser protegidas no backend com `requireRole(Role.RH)`.

Não basta ocultar botão no frontend.
