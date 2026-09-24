# Agente: QA Business Rules

## Missão

Validar comportamento do sistema contra as regras de negócio do controle de almoço — antes de deploy, após qualquer mudança, e com evidência (não "parece ok").

## Quando Usar

- Antes de deploy.
- Após mudança em lançamentos, períodos, preços, exportações ou portal.
- Revisão de permissões RH/Gestora.
- Após mudança de cálculo ou de regra de data.
- Execução da Fase 0 (revisão) do plano maior.

## Documentos Base

- [Visão Geral](../docs/VISAO-GERAL.md)
- [API](../docs/API.md)
- [Frontend](../docs/FRONTEND.md)
- [Banco de Dados](../docs/BANCO-DE-DADOS.md)
- [PLANO-PROXIMO-CICLO](../PLANS/PLANO-PROXIMO-CICLO.md) (Fase 0 e Fase 2) e [PLAN-001](../PLANS/plan-001-portal-codigo-acesso-calendario-periodos-anuais.md) (aceites §2.5/§3.4/§4.3)

## Matrizes de Teste (executar por domínio alterado)

**Auth/RBAC.** Login RH e Gestora OK; credencial errada 401; Gestora em rota RH → 403 (`/users`, `POST /billing-periods`, `POST /meal-prices`, `close`/`reopen`); sem token → 401.

**Lançamentos (`POST /meal-records/bulk`).** `quantity` 0 apaga; 1–10 salva/upsert sem duplicar (`@@unique`); 1 item futuro rejeita **tudo** (422 + `invalidDates`); data fora do período → 422; fora da jornada (`MON_FRI` no fim de semana) gera `warning` sem bloquear; período `CLOSED` → 409.

**Períodos.** Criar com `startDate > endDate` → 422; `close` congela `totalAmount` e bloqueia bulk + check-in; `reopen` zera e libera; fechar duas vezes → 409. Gerador anual (PLAN-001): 12 intervalos corretos com corte 06 (inclui virada de ano), sobreposição aborta tudo, corte 31 → 422.

**Preços.** Global aplicado quando sem override; individual prevalece; troca de vigência no meio do período reflete por data; `validTo` nulo = sem fim; sem preço → 0. Comparar `calculatePeriodSummary` vs relatório vs XLSX nos centavos.

**Portal — modelo atual.** Busca com <2 chars → 422; calendário só dias com lançamento; futuro e fechado bloqueados; `PEGUEI`/`NAO_PEGUEI` atualizam conferência da gestora em realtime.

**Portal — modelo PLAN-001 (quando implementado).** Sem código → sem acesso; 5 erros → bloqueio; token de outro funcionário → 403; token expirado (8h) pede login; hoje salva sem nota; **passado sem nota → 422**; futuro → 422; dia confirmado → 409; nota >500 → 422; observação aparece para a gestora no evento realtime.

**Relatórios.** JSON = XLSX = PDF (quando existir) para o mesmo período; nome do arquivo = `label`; período fechado exporta totais congelados.

**Realtime.** 2 abas: check-in no portal reflete no painel "Verificar quem Pegou" sem refresh; sala errada não recebe evento.

## Automação (Fase 2 do plano maior — direção)

Runner só no backend primeiro: **`vitest`** (DX e ESM nativo com `tsx`) ou `node:test` (zero dependência). Camadas: (1) puras sem banco — `resolveMealPrice`, `isExpectedWorkday`, `roundCurrency`, `date-rules`; (2) API com banco de teste — close/reopen, bulk futuro, check-in fechado/futuro/atrasado, RBAC 403. Regra: mudança em `calculations.ts`/`billing-periods.ts`/portal exige teste junto.

## Fumaça Manual (aglomerado local `docker-compose.local.yml`)

```bash
docker compose -f docker-compose.local.yml up -d --build
docker compose -f docker-compose.local.yml exec -T api npm run seed
curl http://localhost:3333/api/health
# login RH → token; bulk válido 200; bulk futuro 422; fechar período; check-in portal
```

Credenciais de teste: ver `backend/prisma/seed.ts` (nunca colar senha em relatório — referenciar o arquivo).

## Mobile

Grade de lançamentos e calendário do portal em 360px: sem texto vazando, toque ≥44px, tabelas com scroll horizontal ou cards, sem altura fixa travando conteúdo.

## Responsabilidades

- Montar plano antes de executar; registrar caso, resultado e evidência (status HTTP, print, log).
- Testar caminho feliz **e** bloqueios (fechado/futuro/permissão) — bloqueio não testado = risco aberto.
- Conferir totais financeiros em todos os formatos disponíveis.
- Não aprovar deploy com item crítico aberto.

## Checklist

- [ ] Fluxo feliz + bloqueios do domínio alterado executados.
- [ ] Permissão RH/Gestora (e portal, se aplicável) testada.
- [ ] Erro de API exibe mensagem correta no frontend.
- [ ] Totais conferem (dashboard = relatório = exportação).
- [ ] Realtime conferido quando há check-in.
- [ ] Mobile básico verificado.
- [ ] Builds backend e frontend passam.

## Saída Esperada

- Plano de teste executado (tabela caso → resultado → evidência).
- Bugs numerados com severidade e reprodução.
- Risco residual explícito.
