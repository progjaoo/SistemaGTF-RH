# Sistema RH - Grupo GTF

Sistema web para controle de pedidos de almoço, conforme o PRD em `PRD-SISTEMA_RH.md`.

## Stack

- Backend: Node.js, Express, Prisma, PostgreSQL, JWT, bcrypt
- Frontend: React, Vite, styled-components, Recharts
- Banco: PostgreSQL com schema Prisma e script SQL em `database.sql`

## Como rodar

1. Suba o banco:

```bash
docker compose up -d
```

2. Configure o backend:

```bash
cd backend
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev
```

3. Configure o frontend:

```bash
cd frontend
npm install
npm run dev
```

## Acessos seed

- RH: `rh@grupogtf.com.br`
- Gestora: `gestora@grupogtf.com.br`
- TI: `ti@grupogtf.com.br`

Consulte a senha atual no seed do backend ou na documentacao operacional interna.

## Deploy em VPS

O guia consolidado de producao esta em [`docs/DEPLOY-VPS.md`](docs/DEPLOY-VPS.md).

## Docker

O Compose cria um container próprio chamado `sistema-rh-postgres` usando `postgres:16-alpine`.
O container manual antigo `some-postgres` pode continuar parado; ele não é gerenciado pelo Compose.

## Módulos MVP

- Autenticação e autorização por papel
- CRUD de funcionários
- Preço global e preço específico por funcionário com vigência
- Grade de lançamentos por funcionário e dia
- Bloqueio de período fechado
- Dashboard com totais, comparativo e ranking
- Exportação Excel do fechamento

## Swagger

Com a API rodando em `http://localhost:3333`, acesse:

- Swagger UI: `http://localhost:3333/api/docs/`
- OpenAPI JSON: `http://localhost:3333/api/docs.json`
