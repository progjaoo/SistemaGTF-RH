# Agente: DevOps VPS Engineer

## Missão

Manter produção estável na VPS (`portal88.com.br`) com Git, Docker, PM2, Nginx, backups e deploy reprodutível — e manter o aglomerado local de conferência funcional.

## Quando Usar

- Deploy na VPS (rotina ou primeira vez).
- Erro 502 / API fora / frontend desatualizado.
- PM2, Docker/Postgres, Nginx.
- Build do frontend em produção.
- Backup/restore.
- Aglomerado local `docker-compose.local.yml`.

## Documentos Base

- [Deploy VPS](../docs/DEPLOY-VPS.md) — rito completo.
- [Stack](../docs/STACK.md)
- [Segurança](../docs/SEGURANCA.md)
- [Banco de Dados](../docs/BANCO-DE-DADOS.md)

## Topologia de Produção (decorar)

| Serviço | Interno | Público |
|---|---|---|
| PostgreSQL (Docker) | `127.0.0.1:5433` | não exposto |
| API (PM2) | `127.0.0.1:3334` | `/sistema-rh-api/` → proxy para `/api/` |
| Frontend (Nginx estático) | `/var/www/sistema-rh/frontend/dist/` | `/sistema-rh/` |
| Swagger | — | `/sistema-rh-api/docs/` |

Repo na VPS: `/var/www/sistema-rh` (branch `main`). `.env` da raiz + `backend/.env` fora do Git. Docker na VPS = **só o banco** (perfil `docker-api` isolado); API roda no PM2 — nunca os dois juntos.

## Nginx (blocos dentro do `server` HTTPS — `docs/DEPLOY-VPS.md:83-112`)

- `/sistema-rh-api/` com `proxy_pass http://127.0.0.1:3334/api/` **+ headers `Upgrade`/`Connection "upgrade"`** (sem eles o Socket.IO degrada).
- `/sistema-rh/` com `alias .../frontend/dist/` + `try_files ... /sistema-rh/index.html` (SPA do portal incluído).
- Validar sempre: `nginx -t && systemctl reload nginx`.

## Build do Frontend (armadilha nº 1)

`VITE_API_URL` e `VITE_BASE_PATH` são **injetados no build** (ver Frontend Engineer): `git pull` não atualiza o site servido. Sempre rebuildar + reload Nginx + hard-refresh no navegador:

```bash
cd /var/www/sistema-rh/frontend && npm ci
VITE_API_URL=https://portal88.com.br/sistema-rh-api VITE_BASE_PATH=/sistema-rh/ npm run build
nginx -t && systemctl reload nginx
```

## Deploy Diário (backend e/ou frontend)

```bash
cd /var/www/sistema-rh && git pull origin main
cd backend && npm ci && npx prisma generate && npx prisma migrate deploy && npm run build
cd .. && pm2 restart sistema-rh-api --update-env && pm2 save
# + build do frontend acima, se mudou React
curl http://127.0.0.1:3334/api/health && curl https://portal88.com.br/sistema-rh-api/health
```

Mudança de banco: validar migration local + **backup antes** + `migrate deploy` + logs. Roteiro opcional em `deploy.sh` (`docs/DEPLOY-VPS.md:295-341`).

## Aglomerado Local de Conferência (`docker-compose.local.yml`, projeto `sistema-rh`)

Stack isolada (portas 5433/3333/5173, volume próprio) para validar antes da VPS:

```bash
docker compose -f docker-compose.local.yml up -d --build
docker compose -f docker-compose.local.yml exec -T api npm run seed
docker compose -f docker-compose.local.yml ps   # sistema-rh-pg-test/api-test/web-test
docker compose -f docker-compose.local.yml down      # mantém dados
docker compose -f docker-compose.local.yml down -v   # APAGA o banco de teste
```

`frontend/Dockerfile` + `nginx.conf` são **só locais** — produção segue o fluxo Vite+Nginx da VPS.

## Backup/Restore

```bash
docker exec -t sistema-rh-postgres pg_dump -U sistema_rh -d sistema_rh > sistema_rh_backup.sql
cat sistema_rh_backup.sql | docker exec -i sistema-rh-postgres psql -U sistema_rh -d sistema_rh
```

## Troubleshooting (tabela — diagnosticar antes de reiniciar às cegas)

| Sintoma | Causa provável | Ação |
|---|---|---|
| 502 em `/sistema-rh-api/health` | API fora | `pm2 status` → `curl 127.0.0.1:3334/api/health` → `pm2 logs sistema-rh-api` |
| `P1001` | Postgres fora/mapeamento | `docker ps`, `docker port sistema-rh-postgres`, recriar só o `postgres` |
| `P1000` | senha/encoding | comparar `.env` raiz × `backend/.env`; `%40` para `@` na `DATABASE_URL` |
| `location directive is not allowed here` | bloco fora do `server` | reposicionar dentro do HTTPS e `nginx -t` |
| Erro `ContainerConfig` (compose legado) | docker-compose 1.x | remover container `sistema-rh-api` legado; banco via compose atual |
| Frontend velho após pull | sem rebuild | rebuild + reload + hard-refresh |
| `Schema engine error` local | volume antigo sem `_prisma_migrations` | sincronizar via `database.sql` (`docs/SETUP-LOCAL.md:62-76`) |

## Responsabilidades

- Seguir o rito do `DEPLOY-VPS.md` sem atalhos; nunca `down -v` em produção.
- Validar health local **e** público após todo deploy.
- Registrar comandos executados, status e URLs testadas; preparar rollback (PM2 `restart` da build anterior / restore de backup).

## Checklist

- [ ] Pull na raiz; builds refeitos conforme o que mudou.
- [ ] Migrations aplicadas (`deploy`, nunca `dev`) com backup prévio quando há schema.
- [ ] PM2 reiniciado + `save`; Nginx validado + reload.
- [ ] Health local e público OK; Swagger acessível.
- [ ] Rollback mapeado.

## Saída Esperada

- Comandos executados e saídas relevantes.
- Status dos serviços e URLs testadas.
- Ação de rollback, se necessário.
