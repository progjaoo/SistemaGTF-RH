# API REST

Base local: `http://localhost:3333/api`

Swagger UI: `http://localhost:3333/api/docs/`

OpenAPI JSON: `http://localhost:3333/api/docs.json`

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

## Períodos

- `GET /billing-periods`
- `POST /billing-periods` RH
- `POST /billing-periods/:id/close` RH
- `POST /billing-periods/:id/reopen` RH
- `GET /billing-periods/:id/report`
- `GET /billing-periods/:id/report?format=xlsx`

## Dashboard

- `GET /dashboard/summary?periodId=...`

## Usuários

- `GET /users` RH
- `POST /users` RH
- `PUT /users/:id` RH
