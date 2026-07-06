# Segurança

## Princípios

- Segurança crítica fica no backend.
- Tokens, senhas e segredos nunca entram no Git.
- Permissões não devem depender apenas da interface.
- Logs não devem expor credenciais.

## Autenticação

O sistema usa JWT.

Regras:

- Login retorna token.
- Frontend envia token via `Authorization: Bearer`.
- API valida token em rotas protegidas.
- `JWT_SECRET` precisa ser forte em produção.

## Senhas

Senhas de usuários são armazenadas com bcrypt.

Nunca armazenar senha em texto puro.

Seeds podem conter senhas temporárias apenas se for decisão consciente do ambiente. Preferir documentar acesso fora de arquivos públicos quando possível.

## Autorização

Papéis:

```text
RH
GESTORA
```

Rotas administrativas devem exigir:

```ts
requireRole(Role.RH)
```

O frontend pode ocultar menus, mas a API deve bloquear a ação.

## Rotas Públicas Controladas

O Portal do Colaborador expõe rotas públicas em `/employee-portal`.

Decisão aceita para este MVP:

- colaborador se identifica por nome;
- a API retorna apenas `id` e `name`;
- confirmação só altera `MealRecord` existente;
- data futura e período fechado são bloqueados no backend.

Risco: qualquer pessoa com acesso ao link e ao nome pode abrir/alterar a confirmação de um colaborador. Se esse risco deixar de ser aceitável, evoluir para matrícula/código individual antes de ampliar o uso.

## CORS

Configuração vem de:

```env
CORS_ORIGIN
```

Em produção:

```env
CORS_ORIGIN=https://portal88.com.br
```

Evite `*` em produção.

## Variáveis Sensíveis

Não versionar:

```text
.env
.env.local
backend/.env
frontend/.env.production
```

Exemplos podem ser versionados:

```text
.env.example
backend/.env.example
frontend/.env.production.example
```

## Produção

Requisitos mínimos:

- HTTPS ativo.
- Nginx como reverse proxy.
- API exposta apenas via localhost + proxy.
- PostgreSQL não exposto publicamente.
- PM2 com restart automático.
- Backups periódicos.

## Banco

PostgreSQL na VPS deve ficar em:

```text
127.0.0.1:5433
```

Não publicar porta do banco para internet.

## Logs

Pode registrar:

- erro técnico;
- rota;
- status code;
- ação de auditoria.

Não registrar:

- senha;
- token JWT completo;
- `DATABASE_URL`;
- API keys;
- dados sensíveis sem necessidade.

## Auditoria

Use `AuditLog` para ações sensíveis:

- fechamento de período;
- reabertura de período;
- seeds/importações relevantes;
- alterações administrativas críticas.
- confirmações feitas pelo portal público do colaborador.

## Checklist de Segurança

- [ ] Rotas administrativas exigem `Role.RH`.
- [ ] `.env` não foi versionado.
- [ ] API usa `JWT_SECRET` forte.
- [ ] CORS aponta para domínio correto.
- [ ] Banco não está público.
- [ ] Logs não expõem segredos.
- [ ] Nginx está com HTTPS.
- [ ] Backup foi validado.
