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
- `admissionDate`
- `terminationDate`

Funcionário deve ser inativado, não apagado, para preservar histórico.

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

Backup:

```bash
docker exec -t sistema-rh-postgres pg_dump -U sistema_rh -d sistema_rh > sistema_rh_backup.sql
```

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
