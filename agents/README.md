# Agentes de IA - Sistema RH

Este diretório define agentes especializados para apoiar desenvolvimento, revisão e operação do Sistema RH - Grupo GTF.

Use estes agentes como papéis de trabalho em tarefas com IA, code review, planejamento técnico ou execução assistida.

## Índice

| Agente | Quando usar |
| --- | --- |
| [Product Owner RH](./product-owner-rh.md) | Para esclarecer regra de negócio, prioridade, fluxo operacional e impacto para RH/Gestora. |
| [Arquiteto Full-stack](./arquiteto-fullstack.md) | Para decisões entre frontend, backend, banco, API e integrações. |
| [Frontend Engineer](./frontend-engineer.md) | Para telas React, styled-components, UX operacional, responsividade e build Vite. |
| [Backend Engineer](./backend-engineer.md) | Para rotas Express, autenticação, autorização, validação, erros e serviços. |
| [Data Prisma Engineer](./data-prisma-engineer.md) | Para schema Prisma, migrations, seeds, integridade e cálculo histórico. |
| [Security Reviewer](./security-reviewer.md) | Para JWT, RBAC, CORS, secrets, logs e exposição de dados. |
| [QA Business Rules](./qa-business-rules.md) | Para testar regras de almoço, períodos, preços, exportações e permissões. |
| [DevOps VPS Engineer](./devops-vps-engineer.md) | Para deploy, PM2, Docker, Nginx, backups e troubleshooting de produção. |
| [Automation Engineer](./automation-engineer.md) | Para n8n, WAHA, WhatsApp, webhooks e automações auxiliares. |
| [Documentation Maintainer](./documentation-maintainer.md) | Para manter README, docs, guias de setup, API e operação atualizados. |

## Como Escolher

- Mudança de regra de negócio: comece pelo **Product Owner RH**.
- Mudança que atravessa várias camadas: use **Arquiteto Full-stack**.
- Mudança visual ou tela nova: use **Frontend Engineer**.
- Endpoint, autenticação ou regra de API: use **Backend Engineer**.
- Alteração em `schema.prisma`, migration ou seed: use **Data Prisma Engineer**.
- Permissão, token, CORS ou segredo: use **Security Reviewer**.
- Validação de comportamento antes de deploy: use **QA Business Rules**.
- Produção/VPS: use **DevOps VPS Engineer**.
- WhatsApp/n8n/WAHA: use **Automation Engineer**.
- Qualquer mudança que precise ser comunicada para o time: use **Documentation Maintainer**.

## Documentos Base

Antes de executar uma tarefa, o agente deve consultar os documentos relevantes:

- [docs/README.md](../docs/README.md)
- [docs/VISAO-GERAL.md](../docs/VISAO-GERAL.md)
- [docs/STACK.md](../docs/STACK.md)
- [docs/ARQUITETURA.md](../docs/ARQUITETURA.md)
- [docs/FRONTEND.md](../docs/FRONTEND.md)
- [docs/BACKEND.md](../docs/BACKEND.md)
- [docs/BANCO-DE-DADOS.md](../docs/BANCO-DE-DADOS.md)
- [docs/API.md](../docs/API.md)
- [docs/SEGURANCA.md](../docs/SEGURANCA.md)
- [docs/DEPLOY-VPS.md](../docs/DEPLOY-VPS.md)
- [docs/AUTOMACOES.md](../docs/AUTOMACOES.md)
- [docs/CONTRIBUICAO.md](../docs/CONTRIBUICAO.md)

## Protocolo Geral

Todo agente deve:

1. Entender o objetivo da tarefa.
2. Ler a documentação relevante antes de propor mudança.
3. Preservar regras críticas do sistema.
4. Evitar alterar arquivos não relacionados.
5. Rodar validações aplicáveis.
6. Atualizar documentação quando mudar regra, API, deploy ou fluxo.
7. Reportar claramente o que mudou, o que foi validado e riscos restantes.
