# Planejamento — Próximo Ciclo (Sistema RH Grupo GTF)

Decisões de origem (sessão grill-me):
- **1:** A+B — endurecer o núcleo + features operacionais (em sequência, não em paralelo).
- **2:** A+C — portal público segue aberto por nome, mas com mitigação (rate-limit + logs). Matrícula adiada.
- **3:** A+B — testes nas regras financeiras + API crítica.
- **4:** A — PDF prioritário; + importação da planilha da gestora; + jornada personalizada (C) após revisão.

Regra grill-me: nada da Fase 2+ começa com a Fase 0 vermelha.

---

## Fase 0 — Revisão do atual (pré-requisito)

Auditoria manual com roteiro fechado, sem código novo:

- [ ] Totais do dashboard batem com `GET /billing-periods/:id/report` (JSON) e com o XLSX — `backend/src/services/calculations.ts` vs `backend/src/routes/billing-periods.ts:136-161`.
- [ ] Período `CLOSED` bloqueia bulk, check-in do portal e re-fechamento — `backend/src/routes/meal-records.ts:121-123`, `backend/src/routes/employee-portal.ts:145-147`.
- [ ] `POST /meal-records/bulk` com 1 item futuro rejeita tudo (422 + `invalidDates`).
- [ ] Preço individual prevalece sobre global; troca de vigência no meio do período reflete no relatório — `backend/src/services/calculations.ts:16-20`.
- [ ] `CUSTOM` hoje equivale a "todo dia é útil" — `backend/src/lib/dates.ts:18-22`. Confirmar com o RH se isso já causou lançamento indevido.
- [ ] Socket.IO atualiza o painel "Verificar quem Pegou" com 2 abas abertas.
- [ ] Responsivo: grade de lançamentos em 520px sem vazar texto.

**Aceite:** relatório de achados numerado (bug / dúvida de regra / ok). Bugs críticos viram Fase 1; dúvidas de regra alimentam a Fase 5.

---

## Fase 1 — Endurecer sem fechar o portal

Portal segue aberto por nome, mas deixa de ser indefeso:

- [ ] Rate-limit no Express: `POST /auth/login` restrito (ex: 10 tent/min/IP) + rotas `/employee-portal/*` com limite anti-robô (ex: 60/min/IP). Hoje não há nenhum — `backend/src/server.ts:21-35`.
- [ ] Busca do portal já limita 20 resultados (`employee-portal.ts:63-65`); estender log de abuso (IP + `user-agent` já capturados no check-in, `employee-portal.ts:187-188`) para o `search`.
- [ ] Backup automático + teste de restore. Hoje é só comando manual — `docs/BANCO-DE-DADOS.md:168-182`. Nunca `docker-compose down -v` em produção (`docs/DEPLOY-VPS.md:167-173`).
- [ ] Corrigir achados críticos da Fase 0.

**Aceite:** `/search` sob abuso retorna 429; restore de backup em banco local sobe a API sem erro; Fase 0 sem item crítico aberto.
**Fora:** matrícula/código individual — explicitamente adiado.

---

## Fase 2 — Testes onde dói no bolso

Zero testes hoje (nenhum runner nos `package.json`). Introduzir runner só no backend primeiro (`vitest` ou `node:test` + `tsx`):

- [ ] Puras, sem banco: `resolveMealPrice` (individual > global, `validTo` nulo, troca de vigência), `isExpectedWorkday`, `roundCurrency`, regras de `services/date-rules.ts`.
- [ ] API com banco de teste: close congela `totalAmount`, reopen zera, bulk com data futura → 422 integral, check-in em período fechado → 422, `@@unique([employeeId, date])` não duplica (`schema.prisma:98`).
- [ ] RBAC: `GESTORA` recebe 403 em `POST /billing-periods`, `POST /users`, `POST /meal-prices`.

**Aceite:** `npm test` verde no backend; qualquer mudança em `calculations.ts` ou `billing-periods.ts` exige teste junto.

---

## Fase 3 — PDF do fechamento

- [ ] `GET /billing-periods/:id/report?format=pdf` reutilizando `calculatePeriodSummary` — mesma fonte do JSON e do XLSX, sem recalcular no frontend.
- [ ] Recomendação: `pdfkit` (leve, sem Chromium na VPS) em vez de Puppeteer. Layout espelho do XLSX (`billing-periods.ts:139-154`): cabeçalho do período + tabela por funcionário + total geral.
- [ ] Atualizar `backend/src/docs/openapi.ts` + `docs/API.md` (regra de `docs/ARQUITETURA.md:73`).

**Aceite:** para o mesmo período, JSON = XLSX = PDF nos centavos; RH gera o PDF sem ajuda técnica.

---

## Fase 4 — Ler a planilha da gestora dentro da plataforma

Importação assistida, nunca escrita cega:

- [ ] Upload XLSX → preview com mapeamento nome → `Employee.id` (reusa `normalizeSearch` de `employee-portal.ts:37-44`).
- [ ] Dry-run obrigatório: data futura, data fora do período, nome não encontrado, quantidade > 10 — mesmas regras do bulk (`meal-records.ts:24-31, 125-149`).
- [ ] Commit reaproveita a lógica do `POST /meal-records/bulk` (upsert + warnings de jornada + `AuditLog` com `action: IMPORT_PLANILHA`).
- [ ] Nunca criar período nem funcionário no import; só lançar em período `OPEN` existente.

**Aceite:** planilha real da gestora importa com preview correto; 1 linha inválida bloqueia com mensagem por linha; auditoria registra quem importou.

---

## Fase 5 — Jornada personalizada ✅ IMPLEMENTADA

Modelo travado com o RH: **dias da semana por funcionário** + **só avisa, sem bloquear**.

- [x] Migration `add_employee_workdays`: `Employee.workdays VARCHAR(13)` nulável (CSV `"1,2,3,4,5,6"`, 0=dom).
- [x] `isExpectedWorkday` lê os dias explícitos para qualquer `scheduleType`; `null`/vazio = comportamento legado (`CUSTOM` sem dias continua sempre útil).
- [x] `POST`/`PUT /employees` aceitam `workdays: number[] | null`; resposta expõe array; OpenAPI + `docs/API.md` + `docs/BANCO-DE-DADOS.md` atualizados.
- [x] `EmployeesPage`: checkboxes seg–dom quando jornada = Personalizada; tabela exibe `Personalizada (Seg·Sáb)`.
- [x] Testes: unit (seg–sáb, lixo em CSV, legado) + API bulk (warning domingo, silêncio segunda, round-trip do array).

**Aceite verificado:** CUSTOM seg–sáb gera warning no domingo e não na segunda; `MON_FRI` inalterado. Suíte: 48/48.

---

## Explicitamente fora deste ciclo

Matrícula no portal, multiempresa, WhatsApp Business oficial, app nativo, folha/ponto — todos em `docs/VISAO-GERAL.md:81-87`. Se alguém pedir no meio, volta para grilling antes de entrar no plano.

Ordem de execução: Fase 0 → 1 → 2 em sequência; 3 e 4 em qualquer ordem após a 2; 5 só com a resposta do RH em mãos.
