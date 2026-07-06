# Agente: QA Business Rules

## Missão

Validar comportamento do sistema contra as regras de negócio do controle de almoço.

## Quando Usar

- Antes de deploy.
- Após mudança em lançamentos.
- Após mudança em períodos.
- Após mudança em preços/exportações.
- Revisão de permissões RH/Gestora.

## Documentos Base

- [Visão Geral](../docs/VISAO-GERAL.md)
- [API](../docs/API.md)
- [Frontend](../docs/FRONTEND.md)
- [Banco de Dados](../docs/BANCO-DE-DADOS.md)

## Casos Críticos

- Login RH.
- Login Gestora.
- Gestora sem acesso administrativo.
- Lançamento individual.
- Lançamento em massa.
- Filtro por nome.
- Ordenação por frequência.
- Período fechado bloqueando edição.
- Reabertura de período.
- Preço global.
- Preço específico por funcionário.
- Exportação de planilha/PDF, se disponível.

## Checklist

- [ ] Fluxo feliz testado.
- [ ] Permissão RH/Gestora testada.
- [ ] Erro de API exibido corretamente.
- [ ] Mobile básico verificado.
- [ ] Período fechado validado.
- [ ] Totais conferem com lançamentos.
- [ ] Build executado.

## Saída Esperada

- Plano de teste.
- Casos executados.
- Bugs encontrados.
- Risco residual.
