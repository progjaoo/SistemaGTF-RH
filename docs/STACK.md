# Stack Técnica

## Tipo do Projeto

- **Web:** frontend React servido como SPA.
- **Mobile:** responsivo via navegador mobile.
- **API:** REST em Node.js/Express.
- **Desktop:** não aplicável.

## Frontend

- React 18.
- TypeScript.
- Vite.
- styled-components.
- lucide-react para ícones.
- Recharts para gráficos.

Pasta:

```text
frontend/
```

Scripts:

```bash
npm run dev
npm run build
npm run preview
```

## Backend

- Node.js.
- Express.
- TypeScript.
- Prisma Client.
- Zod para validação.
- JWT para autenticação.
- bcrypt para senhas.
- Swagger/OpenAPI para documentação da API.

Pasta:

```text
backend/
```

Scripts:

```bash
npm run dev
npm run build
npm start
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run seed:employees:gtf
```

## Banco de Dados

- PostgreSQL.
- Prisma Migrate.
- Schema principal em `backend/prisma/schema.prisma`.

Ambiente local:

```bash
docker compose up -d
```

Ambiente VPS:

- PostgreSQL em Docker.
- Porta local do host: `127.0.0.1:5433`.
- API acessa via `DATABASE_URL`.

## Produção

- API gerenciada pelo PM2.
- Frontend compilado com Vite em `frontend/dist`.
- Nginx serve o frontend e faz proxy para API.
- PostgreSQL roda em container Docker.

## Automação

Pasta:

```text
automacao-sistema/
```

Stack:

- n8n.
- WAHA.
- Docker Compose próprio.

## Variáveis de Ambiente

Arquivos sensíveis não devem ir para o Git:

```text
.env
.env.local
backend/.env
frontend/.env.production
```

Exemplos versionáveis:

```text
backend/.env.example
frontend/.env.production.example
automacao-sistema/.env.example
```

## Compatibilidade de Deploy

Como o frontend é Vite, produção sempre usa build estático:

```bash
VITE_API_URL=https://portal88.com.br/sistema-rh-api VITE_BASE_PATH=/sistema-rh/ npm run build
```

O Nginx deve servir:

```text
/var/www/sistema-rh/frontend/dist/
```
