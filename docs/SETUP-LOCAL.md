# Setup Local

## Pré-requisitos

- Node.js 20 ou superior.
- npm.
- Docker Desktop ou Docker Engine.
- Git.

## Clonar o Projeto

```bash
git clone https://github.com/progjaoo/SistemaGTF-RH.git
cd SistemaGTF-RH
```

Se o projeto já estiver no diretório local:

```bash
cd /Users/joaomvalente/Documents/Trabalho/Diversos/Sistema-RH
```

## Subir PostgreSQL Local

Na raiz:

```bash
docker compose up -d
```

Verificar:

```bash
docker ps
docker logs sistema-rh-postgres
```

## Backend

```bash
cd backend
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev
```

API local:

```text
http://localhost:3333/api
```

Swagger:

```text
http://localhost:3333/api/docs/
```

### Sincronizar banco local existente

Se o volume local do Postgres já existia antes das migrations novas, aplique o script idempotente da raiz para garantir que colunas recentes foram criadas:

```bash
cd /Users/joaomvalente/Documents/Trabalho/Diversos/Sistema-RH
docker exec -i sistema-rh-postgres psql -U postgres -d sistema_rh < database.sql
```

Depois reinicie o backend:

```bash
cd backend
npm run dev
```

## Frontend

Em outro terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend local:

```text
http://localhost:5173/
```

## Variáveis do Frontend

Por padrão, o frontend usa:

```text
http://localhost:3333/api
```

Para apontar para outra API:

```env
VITE_API_URL=http://localhost:3333/api
```

## Usuários Seed

O seed principal cria usuários de acesso.

Consulte:

```text
backend/prisma/seed.ts
```

O seed adicional de funcionários roda com:

```bash
cd backend
npm run seed:employees:gtf
```

## Build Local

Backend:

```bash
cd backend
npm run build
```

Frontend:

```bash
cd frontend
npm run build
```

## Problemas Comuns

### `DATABASE_URL` não definida

Verifique se `backend/.env` existe e se a API foi reiniciada.

### Prisma não conecta

Verifique se o container do Postgres está ativo.

```bash
docker ps
```

Se `prisma migrate deploy` retornar apenas `Schema engine error` em banco local antigo, use o comando de sincronização com `database.sql` acima. O banco local deste projeto pode ter sido criado antes da tabela `_prisma_migrations`.

### Período não aceita lançamento

Confirme se o período está `OPEN`. Período `CLOSED` bloqueia lançamento e confirmação do colaborador.

Também não é possível lançar data futura. Em períodos que incluem hoje, a tela de lançamentos abre automaticamente na data vigente.

### Frontend não atualiza

Em desenvolvimento, confirme que está acessando o Vite:

```text
http://localhost:5173/
```

Em produção, é necessário gerar novo build em `frontend/dist`.
