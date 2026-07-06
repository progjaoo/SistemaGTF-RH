# Arquitetura

## Contexto

O sistema substitui uma planilha de controle de almoço por uma aplicação web com rastreabilidade, papéis de acesso e fechamento por ciclo financeiro flexível.

## Decisões principais

- Backend separado em `backend/`, expondo API REST em `/api`.
- Frontend separado em `frontend/`, consumindo a API por `VITE_API_URL`.
- Frontend é SPA React/Vite e, em produção, é servido como build estático em `frontend/dist`.
- PostgreSQL como fonte de verdade.
- Prisma como ORM e mecanismo de migrations.
- JWT para sessão e bcrypt para senha.
- Controle de acesso por middleware no backend, não apenas na interface.
- Períodos fechados bloqueiam edição de lançamentos.
- Preços têm vigência e podem ser globais ou específicos por funcionário.
- Produção usa PostgreSQL em Docker, API no PM2 e Nginx como reverse proxy.

## Fronteiras

### Frontend

- Renderiza dashboard, grade de lançamentos, CRUDs administrativos e exportação.
- Faz cálculo visual imediato de totais da grade.
- Não decide permissões finais; apenas oculta ações que a API também bloqueia.
- Mantém páginas em `frontend/src/pages`.
- Mantém componentes reutilizáveis em `frontend/src/components`.
- Mantém funções puras em `frontend/src/utils`.

### Backend

- Valida autenticação, autorização e formato dos dados.
- Calcula relatório de fechamento com preço histórico aplicável por data.
- Mantém auditoria básica para login, cadastro, preço, lançamento e fechamento.
- Expõe Swagger em `/api/docs`.
- Centraliza erros no middleware final do Express.

### Banco

- Mantém histórico de funcionários, preços, lançamentos e períodos.
- Não apaga histórico ao inativar funcionário.
- Usa migrations versionadas pelo Prisma.

## Visão de Fluxo

```text
Navegador
  |
  | HTTP
  v
Frontend React/Vite
  |
  | VITE_API_URL
  v
API Express /api
  |
  | Prisma
  v
PostgreSQL
```

Em produção:

```text
Nginx
├── /sistema-rh/      -> frontend/dist
└── /sistema-rh-api/  -> http://127.0.0.1:3334/api/
```

## Padrões de Evolução

- Mudança de endpoint deve atualizar `docs/API.md` e `backend/src/docs/openapi.ts`.
- Mudança de schema deve criar migration e atualizar `docs/BANCO-DE-DADOS.md`.
- Mudança visual ou estrutural relevante deve atualizar `docs/FRONTEND.md`.
- Mudança de produção deve atualizar `docs/DEPLOY-VPS.md`.

## Próximos incrementos recomendados

- Configuração detalhada de jornada personalizada.
- Importação assistida da planilha histórica.
- Testes automatizados de cálculo de preço vigente.
- Exportação PDF do relatório.
- Separação de equipes por gestora, se o RH confirmar a necessidade.
