# Guia de Contribuição

## Fluxo de Trabalho

1. Entender a regra de negócio.
2. Ler documentação relacionada em `docs/`.
3. Implementar mudança com escopo pequeno.
4. Rodar build/testes aplicáveis.
5. Atualizar documentação se mudar fluxo, API, deploy ou regra.
6. Fazer commit.
7. Fazer push.
8. Na VPS, rodar pull e build/deploy conforme necessário.

## Branches

Fluxo atual usa `main`.

Para mudanças maiores, prefira branch dedicada:

```bash
git checkout -b feature/nome-curto
```

## Commits

Use mensagens objetivas:

```text
Adiciona filtro por nome em lançamentos
Corrige layout mobile da sidebar
Documenta deploy PM2 na VPS
```

Evite mensagens genéricas:

```text
ajustes
update
final
```

## Antes de Commitar

Verifique:

```bash
git status --short
git diff --stat
```

Frontend:

```bash
cd frontend
npm run build
```

Backend:

```bash
cd backend
npm run build
```

## Deploy Depois do Push

Na VPS:

```bash
cd /var/www/sistema-rh
git pull origin main
```

Se mudou backend:

```bash
cd backend
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build

cd ..
pm2 restart sistema-rh-api --update-env
pm2 save
```

Se mudou frontend:

```bash
cd frontend
npm ci
VITE_API_URL=https://portal88.com.br/sistema-rh-api VITE_BASE_PATH=/sistema-rh/ npm run build

nginx -t
systemctl reload nginx
```

Se mudou banco:

- validar migration local;
- fazer backup antes;
- rodar `npx prisma migrate deploy`;
- conferir logs da API.

## Padrões de Código

### TypeScript

- Preferir tipos explícitos em fronteiras públicas.
- Evitar `any`.
- Usar tipos existentes em `frontend/src/types.ts`.
- Não duplicar tipos da API sem necessidade.

### React

- Componentes pequenos e nomeados.
- Estado local perto de onde é usado.
- Hooks genéricos em `hooks/`.
- Funções puras em `utils/`.

### Backend

- Rotas finas.
- Regras complexas em services.
- Validação com Zod.
- Prisma client compartilhado.

### Banco

- Alteração de schema exige migration.
- Não editar migration já aplicada.
- Seeds devem ser seguros para reexecução.

## Checklist de Pull Request ou Revisão

- [ ] Regra de negócio preservada.
- [ ] Permissão validada no backend.
- [ ] Layout responsivo se houver frontend.
- [ ] Build do frontend passou.
- [ ] Build do backend passou.
- [ ] Migrations revisadas, se houver.
- [ ] Docs atualizadas, se necessário.
- [ ] Não há `.env` ou segredo no diff.
- [ ] Fluxo de produção documentado, se mudou deploy.

## O Que Evitar

- Refatorar módulos não relacionados no mesmo commit.
- Misturar deploy, layout e schema sem necessidade.
- Criar dependência nova para problema simples.
- Resolver regra crítica só no frontend.
- Apagar histórico operacional.
- Usar `docker-compose down -v` em produção.
