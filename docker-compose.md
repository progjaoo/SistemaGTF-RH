# Docker + PostgreSQL + Prisma (Deploy em VPS)

## Fluxo com Git na VPS

O repositório local já está vinculado a:

```text
https://github.com/progjaoo/SistemaGTF-RH.git
```

O fluxo recomendado é:

1. Alterar código no Mac.
2. Rodar `git add`, `git commit` e `git push`.
3. Entrar na VPS.
4. Rodar `git pull`.
5. Rebuildar a API e o frontend.

## API gerenciada pelo PM2

Se a API for gerenciada pelo PM2, deixe o Docker responsável apenas pelo PostgreSQL. Não mantenha a API rodando ao mesmo tempo no Docker e no PM2.

No compose de VPS, o serviço `api` fica isolado no profile `docker-api`. Portanto, no fluxo com PM2, use apenas:

```bash
docker-compose -f docker-compose.vps.yml up -d postgres
```

Não use `docker-compose -f docker-compose.vps.yml up -d --build` nesse modo, porque isso é o fluxo antigo da API em Docker.

### Preparar banco Docker para acesso local da API PM2

O `docker-compose.vps.yml` expõe o PostgreSQL somente no localhost da VPS:

```text
127.0.0.1:5433
```

Na VPS:

```bash
cd /var/www/sistema-rh

docker-compose -f docker-compose.vps.yml stop api 2>/dev/null || true
docker rm -f sistema-rh-api 2>/dev/null || true

docker-compose -f docker-compose.vps.yml up -d postgres
```

### Criar `.env` do backend para PM2

Crie o arquivo:

```bash
nano /var/www/sistema-rh/backend/.env
```

Conteúdo:

```env
NODE_ENV=production
PORT=3334
DATABASE_URL="postgresql://sistema_rh:SUA_SENHA_DO_POSTGRES@127.0.0.1:5433/sistema_rh?schema=public"
JWT_SECRET="SEU_JWT_SECRET"
CORS_ORIGIN="https://portal88.com.br"
```

Use os mesmos valores de `POSTGRES_PASSWORD` e `JWT_SECRET` do `.env` da raiz da VPS.

### Instalar dependências e preparar API

```bash
cd /var/www/sistema-rh/backend
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
npm run seed
```

### Subir API no PM2

```bash
cd /var/www/sistema-rh

npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd -u root --hp /root
```

O comando `pm2 startup` vai imprimir um comando grande com `sudo env ...`. Copie e execute esse comando também.

Verificar:

```bash
pm2 status
pm2 logs sistema-rh-api
curl http://127.0.0.1:3334/api/health
curl https://portal88.com.br/sistema-rh-api/health
```

### Atualizar API depois de um `git pull`

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
```

### Primeira configuração do Git na VPS

Na VPS, preserve as pastas manuais atuais e inicialize o Git em `/var/www/sistema-rh`:

```bash
cd /var/www/sistema-rh

mv api api.manual.bak 2>/dev/null || true
mv frontend frontend.manual.bak 2>/dev/null || true

git init
git remote add origin https://github.com/progjaoo/SistemaGTF-RH.git
git fetch origin main
git reset --hard origin/main
```

Confirme que o `.env` da VPS continua existindo na raiz:

```bash
ls -la /var/www/sistema-rh/.env
```

Se não existir, recrie com:

```env
POSTGRES_DB=sistema_rh
POSTGRES_USER=sistema_rh
POSTGRES_PASSWORD=troque_por_senha_forte_sem_caracteres_especiais
JWT_SECRET=troque_por_um_segredo_grande_e_unico
CORS_ORIGIN=https://portal88.com.br
API_HOST_PORT=3334
```

Suba a API usando o compose versionado:

```bash
cd /var/www/sistema-rh
docker-compose -f docker-compose.vps.yml up -d --build
```

Rode o seed quando precisar criar ou atualizar usuários iniciais:

```bash
docker-compose -f docker-compose.vps.yml exec api npm run seed
```

Build do frontend na VPS:

```bash
cd /var/www/sistema-rh/frontend
npm ci
VITE_API_URL=https://portal88.com.br/sistema-rh-api VITE_BASE_PATH=/sistema-rh/ npm run build
```

Configure o Nginx para servir o build em `frontend/dist`:

```nginx
location /sistema-rh/ {
    alias /var/www/sistema-rh/frontend/dist/;
    index index.html;
    try_files $uri $uri/ /sistema-rh/index.html;
}
```

### Atualizações futuras depois do primeiro setup

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

docker-compose -f docker-compose.vps.yml up -d --build

cd frontend
npm ci
VITE_API_URL=https://portal88.com.br/sistema-rh-api VITE_BASE_PATH=/sistema-rh/ npm run build

nginx -t
systemctl reload nginx
```

## Deploy Manual Sistema RH na VPS (`portal88.com.br`)

Use este fluxo manual somente se você ainda não estiver usando Git na VPS.

### 1. Estrutura esperada na VPS

```bash
/var/www/sistema-rh
├── api
├── frontend
├── docker-compose.yml
└── .env
```

Na sua máquina local, envie o backend para a pasta `api` e o compose de VPS para a raiz:

```bash
rsync -av --delete \
  --exclude node_modules \
  --exclude dist \
  --exclude .env \
  backend/ root@IP_DA_VPS:/var/www/sistema-rh/api/

scp docker-compose.vps.yml root@IP_DA_VPS:/var/www/sistema-rh/docker-compose.yml
```

### 2. Criar o `.env` da raiz do compose na VPS

No servidor:

```bash
cd /var/www/sistema-rh
nano .env
```

Conteúdo recomendado:

```env
POSTGRES_DB=sistema_rh
POSTGRES_USER=sistema_rh
POSTGRES_PASSWORD=troque_por_senha_forte_sem_caracteres_especiais
JWT_SECRET=troque_por_um_segredo_grande_e_unico
CORS_ORIGIN=https://portal88.com.br
API_HOST_PORT=3334
```

Observação: deixe o `POSTGRES_PASSWORD` sem caracteres especiais no primeiro deploy para evitar problemas de encoding dentro da `DATABASE_URL`.

### 3. Subir API + banco

```bash
cd /var/www/sistema-rh
docker compose up -d --build
```

O compose sobe:

- `sistema-rh-postgres`: PostgreSQL interno, sem porta pública.
- `sistema-rh-api`: API Node/Express em `127.0.0.1:3334`.

Verificar:

```bash
docker compose ps
docker logs -f sistema-rh-api
curl http://127.0.0.1:3334/api/health
```

### 4. Rodar seed inicial, se o banco estiver vazio

Depois que os containers subirem:

```bash
docker compose exec api npm run seed
```

Acessos seed:

- `rh@gtf.com.br` / `123456`
- `gestora@gtf.com.br` / `123456`

### 5. Publicar no Nginx sem conflitar com PM2

Como `portal88.com.br` já atende outros sistemas, a forma mais segura é publicar a API em um prefixo, por exemplo `/sistema-rh-api/`.

Exemplo de bloco Nginx dentro do server HTTPS de `portal88.com.br`:

```nginx
location /sistema-rh-api/ {
    proxy_pass http://127.0.0.1:3334/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Depois:

```bash
nginx -t
systemctl reload nginx
```

Teste externo:

```bash
curl https://portal88.com.br/sistema-rh-api/health
```

Swagger:

```text
https://portal88.com.br/sistema-rh-api/docs/
```

### 6. Atualizar a API depois de alterações

```bash
rsync -av --delete \
  --exclude node_modules \
  --exclude dist \
  --exclude .env \
  backend/ root@IP_DA_VPS:/var/www/sistema-rh/api/

ssh root@IP_DA_VPS
cd /var/www/sistema-rh
docker compose up -d --build
```

### 7. Publicar o frontend

O frontend deve chamar a API pelo prefixo público configurado no Nginx:

```text
https://portal88.com.br/sistema-rh-api
```

Como o site será publicado em um subcaminho do domínio, use também o base path:

```text
/sistema-rh/
```

Na máquina local:

```bash
cd frontend
VITE_API_URL=https://portal88.com.br/sistema-rh-api VITE_BASE_PATH=/sistema-rh/ npm run build
rsync -av --delete -e "ssh -p 22022" dist/ root@143.95.213.195:/var/www/sistema-rh/frontend/
```

Se preferir criar um arquivo de ambiente antes do build, copie o exemplo:

```bash
cd frontend
cp .env.production.example .env.production
npm run build
```

Depois envie o `dist/` para a VPS com o mesmo `rsync`.

### 8. Publicar o frontend no Nginx

No mesmo `server` HTTPS de `portal88.com.br`, adicione:

```nginx
location /sistema-rh/ {
    alias /var/www/sistema-rh/frontend/;
    index index.html;
    try_files $uri $uri/ /sistema-rh/index.html;
}
```

Valide e recarregue:

```bash
nginx -t
systemctl reload nginx
```

Acesse:

```text
https://portal88.com.br/sistema-rh/
```

### 9. Checklist rápido pós-deploy

```bash
curl http://127.0.0.1:3334/api/health
curl https://portal88.com.br/sistema-rh-api/health
curl -I https://portal88.com.br/sistema-rh/
```

Se o frontend abrir, mas o login falhar, confira no navegador se a chamada está indo para:

```text
https://portal88.com.br/sistema-rh-api/auth/login
```

### 10. Backup do banco na VPS

```bash
cd /var/www/sistema-rh
docker compose exec -T postgres pg_dump -U sistema_rh -d sistema_rh > sistema_rh_backup.sql
```

Restaurar:

```bash
cat sistema_rh_backup.sql | docker compose exec -T postgres psql -U sistema_rh -d sistema_rh
```

Este documento contém os principais comandos para subir um banco PostgreSQL utilizando Docker, conectar com Prisma e realizar backup/restauração entre a máquina local e a VPS.

---

# 1. Criar diretório do banco

```bash
mkdir app-db
cd app-db
```

---

# 2. Criar o docker-compose.yml

```bash
nano docker-compose.yml
```

Conteúdo:

```yaml
services:
  postgres:
    image: postgres:16
    container_name: postgres_app
    restart: always

    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: senha_forte_aqui
      POSTGRES_DB: nome_do_banco

    ports:
      - "5432:5432"

    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

---

# 3. Subir o container

```bash
docker compose up -d
```

Verificar:

```bash
docker ps
```

Entrar no banco:

```bash
docker exec -it postgres_app psql -U postgres -d nome_do_banco
```

---

# 4. Configurar o Prisma

Arquivo `.env`

```env
DATABASE_URL="postgresql://postgres:senha_forte_aqui@localhost:5432/nome_do_banco?schema=public"
```

Gerar cliente:

```bash
npx prisma generate
```

Aplicar migrations:

```bash
npx prisma migrate deploy
```

---

# 5. Criar Backup do Banco Local

Descubra o nome do container:

```bash
docker ps
```

Criar backup:

```bash
docker exec -t nome_container_local \
pg_dump -U postgres -d nome_do_banco > backup.sql
```

---

# 6. Enviar Backup para a VPS

```bash
scp backup.sql root@IP_DA_VPS:/root/app-db/backup.sql
```

---

# 7. Restaurar o Backup

```bash
cat backup.sql | docker exec -i postgres_app \
psql -U postgres -d nome_do_banco
```

---

# 8. Limpar completamente o banco (caso necessário)

Entrar no PostgreSQL:

```bash
docker exec -it postgres_app psql -U postgres -d nome_do_banco
```

Executar:

```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
```

Sair:

```sql
\q
```

Restaurar novamente:

```bash
cat backup.sql | docker exec -i postgres_app \
psql -U postgres -d nome_do_banco
```

---

# 9. Comandos Docker úteis

Containers em execução:

```bash
docker ps
```

Todos os containers:

```bash
docker ps -a
```

Parar container:

```bash
docker stop postgres_app
```

Iniciar container:

```bash
docker start postgres_app
```

Reiniciar:

```bash
docker restart postgres_app
```

Logs:

```bash
docker logs postgres_app
```

Logs em tempo real:

```bash
docker logs -f postgres_app
```

Entrar no container:

```bash
docker exec -it postgres_app bash
```

Remover container:

```bash
docker rm -f postgres_app
```

---

# 10. Comandos Prisma

Gerar Client:

```bash
npx prisma generate
```

Criar migration:

```bash
npx prisma migrate dev --name nome_da_migration
```

Aplicar migrations em produção:

```bash
npx prisma migrate deploy
```

Visualizar banco:

```bash
npx prisma studio
```

Sincronizar schema sem migration (não recomendado em produção):

```bash
npx prisma db push
```

---

# 11. Backup automático (opcional)

Criar backup com data:

```bash
docker exec postgres_app pg_dump -U postgres nome_do_banco \
> backup-$(date +%F).sql
```

Exemplo:

```
backup-2026-06-19.sql
```

---

# Fluxo recomendado

1. Criar a VPS.
2. Instalar Docker e Docker Compose.
3. Criar o `docker-compose.yml`.
4. Executar `docker compose up -d`.
5. Configurar a variável `DATABASE_URL`.
6. Executar `npx prisma migrate deploy`.
7. Criar backup do banco local.
8. Enviar o backup para a VPS.
9. Restaurar o backup.
10. Publicar a API.

---

# Estrutura recomendada da VPS

```
/root
│
└── app-db
    ├── docker-compose.yml
    ├── backup.sql
    └── postgres_data (volume Docker)
```

---

# Observações

* Nunca utilize a senha padrão em produção.
* Faça backups periódicos do banco.
* Não exponha a porta 5432 para a internet sem firewall.
* Utilize um proxy reverso (Nginx/Caddy) para a API.
* Em produção, utilize sempre `prisma migrate deploy` em vez de `prisma migrate dev`.
