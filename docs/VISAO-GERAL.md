# Visão Geral

## Objetivo

O Sistema RH substitui o controle manual em planilhas para gestão de almoço dos colaboradores do Grupo GTF.

O sistema centraliza:

- cadastro de funcionários;
- lançamentos diários de almoço;
- controle de preço global e individual;
- períodos de fechamento;
- dashboard de conferência;
- exportações para conferência;
- usuários com perfis de acesso.

## Usuários

### RH

Perfil administrativo.

Pode:

- cadastrar e editar funcionários;
- cadastrar preços;
- criar, fechar e reabrir períodos;
- gerenciar usuários;
- lançar refeições;
- exportar relatórios;
- consultar dashboard.

### Gestora

Perfil operacional.

Pode:

- lançar refeições;
- consultar informações necessárias ao fluxo operacional;
- atuar dentro das restrições definidas pelo backend.

Não deve acessar ações administrativas de RH.

## Fluxo Principal

1. RH cria ou mantém funcionários ativos.
2. RH configura preço global ou específico por funcionário.
3. Gestora ou RH lança as quantidades de almoço por funcionário/dia.
4. Dashboard consolida totais do período.
5. RH fecha o período.
6. Período fechado bloqueia edições.
7. Se necessário, RH reabre o período com confirmação.
8. RH exporta planilhas/relatórios para conferência.

## Regras Centrais

- Funcionário inativado não deve perder histórico.
- Lançamento pertence a um período de faturamento.
- Período fechado não aceita edição de lançamentos.
- Preços são calculados por vigência.
- Usuário `GESTORA` não deve executar ações exclusivas de `RH`.
- Portal do colaborador exige nome + código de 6 dígitos; confirmação é ato único (sem troca pelo portal).
- Períodos podem ser mensais, anuais ou gerados em lote (ano → 12 mensais, corte 06).
- A API é a fonte final de validação de permissões.

## Módulos

- Login e sessão.
- Dashboard.
- Lançamentos.
- Funcionários.
- Preços.
- Períodos.
- Usuários.
- Exportações.
- Automação externa de enquete de almoço via n8n + WAHA.

## Escopo Atual

O projeto é um web app responsivo com API própria. O acesso mobile acontece pelo navegador do celular, não por aplicativo nativo.

## Fora do Escopo Atual

- Aplicativo mobile nativo.
- Integração oficial com WhatsApp Business API.
- Multiempresa.
- Gestão completa de folha/ponto.
- Controle avançado de jornada personalizada, salvo evoluções futuras.
