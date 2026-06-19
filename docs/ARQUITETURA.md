# Arquitetura

## Contexto

O sistema substitui uma planilha de controle de almoço por uma aplicação web com rastreabilidade, papéis de acesso e fechamento por ciclo financeiro flexível.

## Decisões principais

- Backend separado em `backend/`, expondo API REST em `/api`.
- Frontend separado em `frontend/`, consumindo a API por `VITE_API_URL`.
- PostgreSQL como fonte de verdade.
- Prisma como ORM e mecanismo de migrations.
- JWT para sessão e bcrypt para senha.
- Controle de acesso por middleware no backend, não apenas na interface.
- Períodos fechados bloqueiam edição de lançamentos.
- Preços têm vigência e podem ser globais ou específicos por funcionário.

## Fronteiras

### Frontend

- Renderiza dashboard, grade de lançamentos, CRUDs administrativos e exportação.
- Faz cálculo visual imediato de totais da grade.
- Não decide permissões finais; apenas oculta ações que a API também bloqueia.

### Backend

- Valida autenticação, autorização e formato dos dados.
- Calcula relatório de fechamento com preço histórico aplicável por data.
- Mantém auditoria básica para login, cadastro, preço, lançamento e fechamento.

### Banco

- Mantém histórico de funcionários, preços, lançamentos e períodos.
- Não apaga histórico ao inativar funcionário.

## Próximos incrementos recomendados

- Configuração detalhada de jornada personalizada.
- Importação assistida da planilha histórica.
- Testes automatizados de cálculo de preço vigente.
- Exportação PDF do relatório.
- Separação de equipes por gestora, se o RH confirmar a necessidade.
