# Agentes Recomendados

Use estes perfis como checklist de revisão para evoluir o projeto.

## Arquiteto Full-stack

- Revisa fronteiras entre frontend, backend e banco.
- Garante que regras críticas ficam na API.
- Mantém decisões em `docs/ARQUITETURA.md`.

## Especialista de Dados e Prisma

- Cuida de migrations, índices, integridade referencial e seed.
- Valida cálculo histórico de preço por vigência.
- Revisa impactos antes de alterar `prisma/schema.prisma`.

## Segurança e Acesso

- Revisa JWT, bcrypt, CORS, variáveis de ambiente e RBAC.
- Garante que rotas de RH não vazem para Gestora.
- Define checklist de produção: HTTPS, segredo forte e backup.

## UX Operacional

- Revisa a grade de lançamento para notebook, tablet e celular.
- Mantém telas densas, legíveis e adequadas ao uso recorrente do RH.
- Valida estados de erro, vazio, carregamento e período fechado.

## QA de Regras de Negócio

- Testa lançamentos fora da jornada.
- Testa período fechado sem edição.
- Testa preço global, preço individual e troca de vigência.
- Compara relatório exportado com totais exibidos no dashboard.

## Documentação e Onboarding

- Mantém `README.md`, exemplos de `.env` e instruções de execução.
- Registra perguntas abertas do PRD e decisões tomadas.
- Prepara guia curto para RH e Gestora.

## DevOps e Operação

- Define deploy, variáveis de ambiente, backups e observabilidade.
- Automatiza migrations no pipeline.
- Garante que logs não exponham senhas ou tokens.
