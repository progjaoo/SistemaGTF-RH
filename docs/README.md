# Documentação do Sistema RH

Este diretório reúne as diretrizes técnicas, padrões de projeto e guias operacionais do Sistema RH - Grupo GTF.

## Stack e Tipo

- **Tipo:** Web app responsivo + API REST.
- **Frontend:** React, TypeScript, Vite, styled-components, Recharts.
- **Backend:** Node.js, Express, TypeScript, Prisma, JWT, bcrypt.
- **Banco:** PostgreSQL.
- **Infra:** Docker, Nginx, PM2.
- **Automação:** n8n + WAHA para fluxos auxiliares de WhatsApp.

## Índice

| Documento | Uso |
| --- | --- |
| [VISÃO GERAL](./VISAO-GERAL.md) | Entendimento do produto, módulos e papéis. |
| [STACK](./STACK.md) | Tecnologias, scripts e responsabilidades de cada camada. |
| [SETUP LOCAL](./SETUP-LOCAL.md) | Como rodar o projeto em ambiente de desenvolvimento. |
| [ARQUITETURA](./ARQUITETURA.md) | Decisões arquiteturais e fronteiras entre frontend, backend e banco. |
| [FRONTEND](./FRONTEND.md) | Padrões de componentes, páginas, hooks, layout, responsividade e build. |
| [BACKEND](./BACKEND.md) | Padrões de rotas, middlewares, validação, erros e autenticação. |
| [BANCO DE DADOS](./BANCO-DE-DADOS.md) | Prisma, migrations, seeds, histórico e integridade. |
| [API](./API.md) | Endpoints REST, Swagger e regras de acesso. |
| [SEGURANÇA](./SEGURANCA.md) | JWT, RBAC, CORS, variáveis sensíveis e práticas de produção. |
| [DEPLOY VPS](./DEPLOY-VPS.md) | Produção em VPS com PostgreSQL Docker, API PM2, frontend Nginx. |
| [AUTOMAÇÕES](./AUTOMACOES.md) | Integrações auxiliares como n8n + WAHA. |
| [CONTRIBUIÇÃO](./CONTRIBUICAO.md) | Fluxo de branches, commits, revisão e checklist de entrega. |
| [AGENTES](./AGENTES.md) | Perfis de revisão recomendados para evoluir o projeto. |

## Leitura Recomendada por Perfil

Para uma pessoa nova no projeto:

1. [VISÃO GERAL](./VISAO-GERAL.md)
2. [STACK](./STACK.md)
3. [SETUP LOCAL](./SETUP-LOCAL.md)
4. [ARQUITETURA](./ARQUITETURA.md)

Para frontend:

1. [FRONTEND](./FRONTEND.md)
2. [API](./API.md)
3. [SEGURANÇA](./SEGURANCA.md)

Para backend:

1. [BACKEND](./BACKEND.md)
2. [BANCO DE DADOS](./BANCO-DE-DADOS.md)
3. [API](./API.md)
4. [SEGURANÇA](./SEGURANCA.md)

Para operação:

1. [DEPLOY VPS](./DEPLOY-VPS.md)
2. [SETUP LOCAL](./SETUP-LOCAL.md)
3. [BANCO DE DADOS](./BANCO-DE-DADOS.md)
4. [AUTOMAÇÕES](./AUTOMACOES.md)

## Princípios do Projeto

- Regras críticas ficam no backend, não só na interface.
- O banco guarda histórico; exclusões operacionais devem preferir inativação.
- Fechamento de período bloqueia edição de lançamentos.
- Frontend deve ser operacional, denso e responsivo, sem aparência de landing page.
- Deploy deve ser reprodutível por Git, build explícito e variáveis fora do repositório.
- Documentação deve ser atualizada junto com mudanças de fluxo, API, deploy ou regra de negócio.
