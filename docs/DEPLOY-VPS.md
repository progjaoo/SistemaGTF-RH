# Deploy VPS - Sistema RH

Este documento consolida o fluxo de producao usado no Sistema RH Grupo GTF em `portal88.com.br`.

## Arquitetura de producao

- Dominio: `https://portal88.com.br`
- Pasta da aplicacao: `/var/www/sistema-rh`
- Repositorio Git: `https://github.com/progjaoo/SistemaGTF-RH.git`
- Banco: PostgreSQL em Docker
- API: Node.js/Express gerenciada pelo PM2
- Frontend: React/Vite compilado em `frontend/dist` e servido pelo Nginx
- Swagger: `https://portal88.com.br/sistema-rh-api/docs/`

## Portas e rotas

| Servico | Interno | Publico |
| --- | --- | --- |
| PostgreSQL | `127.0.0.1:5433` | nao exposto |
| API PM2 | `127.0.0.1:3334` | `/sistema-rh-api/` |
| Frontend | arquivos em `frontend/dist` | `/sistema-rh/` |

## Estrutura na VPS

```text
/var/www/sistema-rh
├── backend
├── frontend
├── docs
├── docker-compose.vps.yml
├── ecosystem.config.cjs
└── .env
```

O arquivo `.env` da raiz e o `backend/.env` nao devem ir para o Git.

## Variaveis da raiz

Arquivo:

```bash
/var/www/sistema-rh/.env
```

Modelo:

```env
POSTGRES_DB=sistema_rh
POSTGRES_USER=sistema_rh
POSTGRES_PASSWORD=SENHA_DO_POSTGRES
JWT_SECRET=SEGREDO_GRANDE_DA_API
CORS_ORIGIN=https://portal88.com.br
API_HOST_PORT=3334
POSTGRES_HOST_PORT=5433
```

Se a senha do Postgres tiver caracteres especiais, eles precisam ser codificados apenas na `DATABASE_URL` do backend. Exemplo: `@` vira `%40`.

## Variaveis do backend

Arquivo:

```bash
/var/www/sistema-rh/backend/.env
```

Modelo:

```env
NODE_ENV=production
PORT=3334
DATABASE_URL="postgresql://sistema_rh:SENHA_DO_POSTGRES_CODIFICADA@127.0.0.1:5433/sistema_rh?schema=public"
JWT_SECRET="SEGREDO_GRANDE_DA_API"
CORS_ORIGIN="https://portal88.com.br"
```

Exemplo de senha com `@`:

```text
Senha@123 -> Senha%40123
```

## Nginx

Os blocos abaixo devem ficar dentro do `server` HTTPS de `portal88.com.br`, ou seja, dentro do bloco que possui:

```nginx
listen 443 ssl;
server_name portal88.com.br;
```

Nao coloque os `location` fora do `server`, nem dentro de outro `location`.

```nginx
location /sistema-rh-api/ {
    proxy_pass http://127.0.0.1:3334/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /sistema-rh/ {
    alias /var/www/sistema-rh/frontend/dist/;
    index index.html;
    try_files $uri $uri/ /sistema-rh/index.html;
}
```

Validar:

```bash
nginx -t
systemctl reload nginx
```

## Primeiro setup com Git

Na VPS:

```bash
cd /var/www/sistema-rh

mv api api.manual.bak 2>/dev/null || true
mv frontend frontend.manual.bak 2>/dev/null || true

apt install -y git

git init
git remote add origin https://github.com/progjaoo/SistemaGTF-RH.git
git fetch origin main
git reset --hard origin/main
```

Depois recrie/valide os arquivos `.env` da raiz e `backend/.env`.

## Subir PostgreSQL no Docker

No fluxo atual, Docker fica responsavel apenas pelo banco.

```bash
cd /var/www/sistema-rh

docker-compose -f docker-compose.vps.yml stop api 2>/dev/null || true
docker rm -f sistema-rh-api 2>/dev/null || true

docker-compose -f docker-compose.vps.yml up -d postgres
```

Verificar:

```bash
docker ps
docker port sistema-rh-postgres
```

Saida esperada:

```text
5432/tcp -> 127.0.0.1:5433
```

Nao use:

```bash
docker-compose down -v
```

Esse comando apaga o volume do banco.

## Preparar backend

```bash
cd /var/www/sistema-rh/backend

npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
npm run seed
```

Usuarios criados pelo seed:

```text
rh@grupogtf.com.br
gestora@grupogtf.com.br
ti@grupogtf.com.br
```

Somente `gestora@grupogtf.com.br` usa perfil nao administrativo.

## Subir API no PM2

```bash
cd /var/www/sistema-rh

npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd -u root --hp /root
```

O `pm2 startup` imprime um comando grande com `sudo env ...`. Execute o comando impresso para registrar o PM2 no boot.

Verificar:

```bash
pm2 status
pm2 logs sistema-rh-api
curl http://127.0.0.1:3334/api/health
curl https://portal88.com.br/sistema-rh-api/health
```

## Build do frontend

React/Vite em producao e servido como build estatico. O `git pull` atualiza o codigo-fonte, mas nao atualiza o que o Nginx entrega ate o build ser refeito.

```bash
cd /var/www/sistema-rh/frontend

npm ci
VITE_API_URL=https://portal88.com.br/sistema-rh-api VITE_BASE_PATH=/sistema-rh/ npm run build
```

Depois:

```bash
nginx -t
systemctl reload nginx
```

Testar:

```bash
curl -I https://portal88.com.br/sistema-rh/
```

## Fluxo de deploy diario

No Mac:

```bash
cd /Users/joaomvalente/Documents/Trabalho/Diversos/Sistema-RH

git add .
git commit -m "descreva a alteracao"
git push origin main
```

Na VPS:

```bash
cd /var/www/sistema-rh
git pull origin main

cd backend
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build

cd ..
pm2 restart sistema-rh-api --update-env
pm2 save

cd frontend
npm ci
VITE_API_URL=https://portal88.com.br/sistema-rh-api VITE_BASE_PATH=/sistema-rh/ npm run build

nginx -t
systemctl reload nginx
```

## Script opcional de deploy

Arquivo:

```bash
/var/www/sistema-rh/deploy.sh
```

Conteudo:

```bash
#!/bin/bash
set -e

cd /var/www/sistema-rh

git pull origin main

cd backend
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build

cd ..
pm2 restart sistema-rh-api --update-env
pm2 save

cd frontend
npm ci
VITE_API_URL=https://portal88.com.br/sistema-rh-api VITE_BASE_PATH=/sistema-rh/ npm run build

nginx -t
systemctl reload nginx
```

Permissao:

```bash
chmod +x /var/www/sistema-rh/deploy.sh
```

Uso:

```bash
/var/www/sistema-rh/deploy.sh
```

## Troubleshooting

### `location directive is not allowed here`

O bloco `location` foi colado fora do `server`.

Inspecione:

```bash
nl -ba /etc/nginx/sites-enabled/default | sed -n '80,140p'
```

Cole os blocos `/sistema-rh-api/` e `/sistema-rh/` dentro do `server` HTTPS.

### `502 Bad Gateway` em `/sistema-rh-api/health`

Verifique se a API esta rodando:

```bash
pm2 status
curl http://127.0.0.1:3334/api/health
```

Se a API local falhar:

```bash
pm2 logs sistema-rh-api
```

### `P1001: Can't reach database server`

O Postgres nao esta acessivel em `127.0.0.1:5433`.

```bash
docker ps
docker port sistema-rh-postgres
docker-compose -f docker-compose.vps.yml up -d --force-recreate postgres
```

### `P1000: Authentication failed`

A senha do banco no `backend/.env` nao bate com a senha real do Postgres, ou a senha tem caractere especial nao codificado.

Verifique:

```bash
cat /var/www/sistema-rh/.env
cat /var/www/sistema-rh/backend/.env
```

Se a senha tiver `@`, use `%40` na `DATABASE_URL`.

### Erro `ContainerConfig` no `docker-compose`

Esse erro vem da combinacao Docker novo com `docker-compose` legado `1.29.2` ao recriar containers.

Para a API, o fluxo atual usa PM2. Remova a API Docker se necessario:

```bash
docker rm -f sistema-rh-api 2>/dev/null || true
```

Para o banco:

```bash
docker-compose -f docker-compose.vps.yml up -d postgres
```

### Frontend nao atualizou apos `git pull`

Rebuildar o frontend:

```bash
cd /var/www/sistema-rh/frontend
VITE_API_URL=https://portal88.com.br/sistema-rh-api VITE_BASE_PATH=/sistema-rh/ npm run build
systemctl reload nginx
```

Depois limpar cache no navegador com reload forte.

## Comandos uteis

```bash
pm2 status
pm2 logs sistema-rh-api
pm2 restart sistema-rh-api --update-env

docker ps
docker logs --tail=80 sistema-rh-postgres
docker-compose -f docker-compose.vps.yml ps

curl http://127.0.0.1:3334/api/health
curl https://portal88.com.br/sistema-rh-api/health
curl -I https://portal88.com.br/sistema-rh/
```

## Backup do banco

Backup:

```bash
cd /var/www/sistema-rh
docker exec -t sistema-rh-postgres pg_dump -U sistema_rh -d sistema_rh > sistema_rh_backup.sql
```

Restauracao:

```bash
cat sistema_rh_backup.sql | docker exec -i sistema-rh-postgres psql -U sistema_rh -d sistema_rh
```
