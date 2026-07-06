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
- `500`: erro inesperado.
- `503`: banco indisponível ou mal configurado.

## Autenticação

- `POST /auth/login`
- `GET /auth/me`

## Funcionários

- `GET /employees`
- `POST /employees` RH
- `PUT /employees/:id` RH
- `DELETE /employees/:id` RH, inativa sem apagar histórico

## Preços

- `GET /meal-prices`
- `POST /meal-prices` RH

## Lançamentos

- `GET /meal-records?periodId=...`
- `POST /meal-records/bulk`
- `GET /meal-records/confirmations?periodId=...&date=...`

Regras:

- `POST /meal-records/bulk` rejeita a requisição inteira com `422` se qualquer item tiver `date` maior que hoje.
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

Rotas públicas, sem JWT:

- `GET /employee-portal/search?name=...`
- `GET /employee-portal/:employeeId/calendar?month=YYYY-MM`
- `POST /employee-portal/:employeeId/checkin`

Regras:

- A busca retorna somente `id` e `name` de funcionários ativos.
- O calendário retorna apenas dias com lançamento existente (`quantity > 0`).
- O check-in aceita apenas `PEGUEI` ou `NAO_PEGUEI`.
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

Observação: RH pode criar períodos futuros para planejamento. As validações permanecem em formato de data, intervalo válido (`startDate <= endDate`) e permissões.

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
