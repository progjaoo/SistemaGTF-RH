# Banco de Dados

## Tecnologia

- PostgreSQL.
- Prisma ORM.
- Prisma Migrate.

Schema:

```text
backend/prisma/schema.prisma
```

Migrations:

```text
backend/prisma/migrations/
```

## Modelos Principais

### `User`

Usuários do sistema.

Campos relevantes:

- `name`
- `email`
- `passwordHash`
- `role`
- `active`

Papéis:

- `RH`
- `GESTORA`

### `Employee`

Funcionários que podem receber lançamento de almoço.

Campos relevantes:

- `name`
- `status`
- `scheduleType`
- `workdays`
- `admissionDate`
- `terminationDate`

Funcionário deve ser inativado, não apagado, para preservar histórico.

`workdays` guarda os dias esperados como CSV (`0`=dom .. `6`=sáb, ex: `"1,2,3,4,5,6"` para seg–sáb). `null` = segue o `scheduleType`. A API expõe como array (`[1,2,3,4,5,6]`) e aceita o array em `POST`/`PUT` (1–7 valores de 0–6; `null` limpa). O aviso de jornada no bulk usa os dias explícitos quando presentes — sem bloquear.

`accessCodeHash` guarda o bcrypt do código de 6 dígitos do portal; `null` = sem acesso. `accessCodeUpdatedAt` registra a última emissão. A API **nunca** expõe o hash — só `hasAccessCode` (admin) e `hasAccess` (busca do portal).

### `MealPrice`

Preço global ou individual com vigência.

Campos relevantes:

- `value`
- `validFrom`
- `validTo`
- `employeeId`

Quando `employeeId` é nulo, o preço é global.

### `MealRecord`

Lançamento diário por funcionário.

Campos relevantes:

- `employeeId`
- `periodId`
- `date`
- `quantity`
- `registeredById`
- `confirmationStatus`
- `confirmationSource`
- `confirmedAt`

Existe unicidade por funcionário e data:

```prisma
@@unique([employeeId, date])
```

Confirmação do colaborador:

- `confirmationStatus`: `PENDING`, `PEGUEI` ou `NAO_PEGUEI`.
- `confirmationSource`: `SISTEMA`, `WHATSAPP` ou nulo enquanto pendente.
- `confirmedAt`: data/hora da última confirmação.

O portal público do colaborador atualiza o próprio `MealRecord`, sem tabela paralela. Isso mantém a gestora, relatórios e conferência usando a mesma fonte de dados.

### `BillingPeriod`

Período de fechamento.

Campos relevantes:

- `label`
- `startDate`
- `endDate`
- `status`
- `closedAt`
- `closedById`
- `totalAmount`

Status:

- `OPEN`
- `CLOSED`

### `AuditLog`

Registro de ações relevantes.

Use quando uma ação altera estado sensível, como fechamento ou reabertura de período.

## Regras de Integridade

- Não apagar funcionário com histórico.
- Não apagar usuário usado em registros/auditoria.
- Não editar lançamento de período fechado.
- Não criar ou editar lançamento em data futura.
- Não confirmar almoço em data futura no portal do colaborador.
- Períodos futuros podem ser criados por RH para planejamento.
- Não alterar migration já aplicada em produção.
- Criar nova migration para mudanças de schema.

## Migrations

Desenvolvimento:

```bash
cd backend
npm run prisma:migrate
```

Produção:

```bash
cd backend
npx prisma migrate deploy
```

Nunca use `prisma migrate dev` em produção.

## Seeds

Seed principal:

```bash
cd backend
npm run seed
```

Seed de funcionários Grupo GTF:

```bash
cd backend
npm run seed:employees:gtf
```

Seeds devem ser idempotentes sempre que possível.

## Backup

Produção usa container `sistema-rh-postgres`.

Backup manual:

```bash
docker exec -t sistema-rh-postgres pg_dump -U sistema_rh -d sistema_rh > sistema_rh_backup.sql
```

Backup automático com retenção (últimos 7, via cron diário `0 3 * * *`):

```bash
/var/www/sistema-rh/scripts/backup-sistema-rh.sh
```

Variáveis do script (com defaults de produção): `BACKUP_CONTAINER`, `BACKUP_USER`, `BACKUP_DB`, `BACKUP_DIR`, `BACKUP_KEEP`. Contra o aglomerado local: `BACKUP_CONTAINER=sistema-rh-pg-test BACKUP_USER=postgres BACKUP_DIR=./backups ./scripts/backup-sistema-rh.sh`.

Restauração:

```bash
cat sistema_rh_backup.sql | docker exec -i sistema-rh-postgres psql -U sistema_rh -d sistema_rh
```

## Senhas e `DATABASE_URL`

Se a senha tiver caracteres especiais, codifique na URL.

Exemplo:

```text
Senha@123 -> Senha%40123
```

Modelo:

```env
DATABASE_URL="postgresql://usuario:senha@host:porta/banco?schema=public"
```

## Checklist para Alterar Schema

- [ ] Confirmar impacto no frontend e API.
- [ ] Criar migration nova.
- [ ] Atualizar Prisma Client.
- [ ] Atualizar seeds se necessário.
- [ ] Atualizar documentação.
- [ ] Testar em banco local.
- [ ] Planejar backup antes de produção.
