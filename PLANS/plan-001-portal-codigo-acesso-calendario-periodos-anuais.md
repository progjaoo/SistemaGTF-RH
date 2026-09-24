# PLAN-001 — Portal do colaborador com código de acesso, calendário mensal com regras de data e períodos anuais

**Status:** decisões travadas com o RH (ver §9) — pronto para implementar na ordem da §8.
**Escopo:** 3 entregas encadeadas — (A) código de acesso por colaborador, (B) calendário mensal funcional com regras de data, (C) períodos anuais + gerador de 12 períodos mensais.
**Premissa:** backend continua fonte final de todas as validações (`docs/ARQUITETURA.md`, `docs/SEGURANCA.md`). Frontend apenas reflete o que a API decide.

---

## 0. Resumo executivo

| Entrega | O que muda para o usuário | Dependência |
|---|---|---|
| A — Código de acesso | Colaborador entra com **nome + código** (definido pelo RH no sistema). Fim do acesso só-por-nome. | Nenhuma (pode começar já) |
| B — Calendário com regras | Só o **dia atual** é clicável direto; dia passado vira **"marcar atrasado" com justificativa obrigatória**; dia futuro é bloqueado. | A (usa a sessão do portal) |
| C — Períodos anuais | RH cria **período anual único** ou **gera os 12 mensais do ano de uma vez** (com dia de corte), para a gestora não esquecer de criar mês a mês. | Nenhuma (independente de A/B) |

Ordem recomendada: **A → B → C**. C pode rodar em paralelo com A se houver braço.

---

## 1. Contexto atual (evidências)

- Portal público em `/colaborador`, sem senha: busca por nome retorna `id`+`name` e o check-in é liberado — `frontend/src/pages/EmployeePortalPage/index.tsx:24-42`, `backend/src/routes/employee-portal.ts:54-68, 121-224`. Risco já admitido em `docs/SEGURANCA.md:46-57`.
- Calendário atual é **lista de cards** (`DaysGrid` em `EmployeeCalendar.tsx:75-86`), não um calendário mensal de verdade; só mostra dias **com lançamento** (`employee-portal.ts:98`, `quantity > 0`).
- Regra visual atual: desabilita `day.date > today || period CLOSED` (`EmployeeCalendar.tsx:80`). Não existe conceito de "atrasado com justificativa" nem campo de comentário em `MealRecord` (`schema.prisma:82-101`).
- Períodos aceitam **qualquer intervalo** — backend só valida `startDate <= endDate` (`billing-periods.ts:35-37`). O ciclo real é dia 06→05 (labels do seed: `"Junho 2026 - 06/06 a 05/07"`, `seed.ts:109-118`). Criação hoje é **manual, um por vez** (`PeriodsPage/index.tsx:20-52`).
- `ScheduleType.CUSTOM` é placebo (sempre dia útil, `lib/dates.ts:18-22`) — fora deste plano (está no PLANO-PROXIMO-CICLO Fase 5).

---

## 2. Parte A — Código de acesso por colaborador ✅ IMPLEMENTADA

Verificado: E2E 10/10 (+1 artefato de janela de rate-limit, confirmado 401 após reset) e suíte 56/56. Baseline do seed restaurado (códigos revogados, check-in resetado).

### 2.1 Decisões de desenho (travadas com o RH — §9)

1. **Formato do código:** 6 dígitos numéricos (ex: `482917`), gerados pelo sistema ou definidos pelo RH, sempre redefiníveis.
2. **Armazenamento:** `Employee.accessCodeHash` (bcrypt, cost 10, mesmo padrão de `seed.ts:12`). **Nunca** armazenar código em texto puro; **nunca** retornar hash na API.
3. **Sessão do portal:** após nome+código válidos, a API emite **token JWT de escopo portal** (`scope: "employee-portal"`, `employeeId`, expiração **8h = um turno**). `calendar` e `checkin` passam a exigir esse token (Bearer).
4. **Funcionários sem código** (carga inicial via banco): busca por nome funciona, mas o passo do código informa "procure o RH para ativar seu acesso" — ninguém entra sem código.
5. **Sem troca pelo portal:** confirmação é ato único; para alterar, o colaborador fala **pessoalmente** com RH/gestora (ajuste, se preciso, via tela de lançamentos do admin). API retorna 409 em dia já confirmado.
6. **Lista de distribuição:** o sistema exibe lista imprimível com os códigos **uma única vez** (na geração em lote); depois, só reemissão gera código novo.

### 2.2 Banco de dados (migration nova, nunca editar aplicada)

```prisma
model Employee {
  // ...existentes
  accessCodeHash      String?   // bcrypt do código; null = sem acesso ativado
  accessCodeUpdatedAt DateTime? // quando foi definido/redefinido (auditoria)
}

model MealRecord {
  // ...existentes
  confirmationNote String? @db.VarChar(500) // justificativa (obrigatória em marcação atrasada, §3)
}
```

- Migration: `xxxx_add_employee_access_code_and_confirmation_note`.
- Backfill: colunas nuláveis → zero impacto nos dados atuais; seed existente continua válido.
- Índices: nenhum novo necessário (busca de funcionário por `id` já indexada; `@@unique([employeeId, date])` inalterado).

### 2.3 API — endpoints novos e alterados

**Novos:**

| Método/Rota | Acesso | Corpo | Resposta |
|---|---|---|---|
| `POST /employee-portal/login` | público + rate-limit | `{ "employeeId": "uuid", "code": "482917" }` | `{ "token": "jwt-portal-8h", "employee": { "id", "name" } }` |
| `POST /employee-portal/logout` (opcional) | token portal | — | `{ "ok": true }` (para invalidar no client; revogação server-side só se necessário) |
| `PUT /employees/:id/access-code` | `RH` | `{ "mode": "generate" }` ou `{ "mode": "set", "code": "482917" }` | `{ "employeeId", "code": "482917" }` — **código em texto puro retornado UMA única vez** |
| `DELETE /employees/:id/access-code` | `RH` | — | revoga acesso (hash → null) |

**Alterados (breaking controlado do portal):**

- `GET /employee-portal/search` — passa a retornar também `hasAccess: boolean` por funcionário (sem expor hash). Mantém limite de 20 resultados.
- `GET /employee-portal/:employeeId/calendar` — exige token portal; valida que `token.employeeId === :employeeId` (403 se divergir).
- `POST /employee-portal/:employeeId/checkin` — exige token portal + mesma validação; corpo `{ "date", "status", "note?" }` (nota opcional no dia, obrigatória em atraso — §3.3); dia já confirmado → **409** "fale pessoalmente com o RH".
- Auditoria (`AuditLog`): `PORTAL_LOGIN`, `PORTAL_LOGIN_FAILED` (sem registrar o código tentado), `ACCESS_CODE_SET`, `ACCESS_CODE_REVOKED`. Segue padrão de `employee-portal.ts:176-191`.

**Rate-limit (amarra com Fase 1 do PLANO-PROXIMO-CICLO):** `POST /employee-portal/login` com limite estrito (ex: 10 tentativas/min por IP + 5 por `employeeId`). Sem isso, código de 6 dígitos é quebrável por força bruta.

### 2.4 Admin (RH) — gestão dos códigos em `EmployeesPage`

- Coluna/status "Acesso": `Ativo` (tem hash) / `Pendente` (sem hash).
- Ações por funcionário: **Gerar código** (sistema gera 6 dígitos) / **Definir código** (RH digita) / **Reemitir** / **Revogar**.
- Após gerar/definir individual: modal **"anote e entregue — este código não será exibido de novo"** com botão copiar.
- **Geração em lote + lista de distribuição:** botão "Gerar códigos pendentes" cria códigos para todos sem acesso e abre **lista imprimível (nome → código) exibida uma única vez**, com checkbox "entregue" por linha e botão "encerrar distribuição". Após encerrar, a lista some — quem perdeu o código precisa de **reemissão** (código novo, anterior invalidado). RH imprime e entrega dentro da empresa.
- Carga em massa: como os colaboradores entrarão **via banco depois**, prover script `backend: npm run access-codes:generate` (ou SQL com função) que gera hash bcrypt para lista de nomes/ids e imprime os códigos em texto puro **uma vez** no terminal para o RH distribuir. Documentar em `docs/BANCO-DE-DADOS.md`.

### 2.5 Cenários de aceite — Parte A

- [ ] Sem código, mesmo com nome certo: portal não abre o calendário (mensagem "procure o RH").
- [ ] Código errado 5x seguidas: bloqueio temporário por IP/funcionário (429), tentativa registrada em `AuditLog` sem o código.
- [ ] Código certo: calendário abre; token expira em 8h (após expirar, nova ação pede login de novo).
- [ ] Dia já confirmado: nova tentativa via portal → 409 sem alterar nada; ajuste só pelo admin/RH.
- [ ] Lista de distribuição: após "encerrar distribuição", recarregar não mostra códigos; reemissão gera código novo e invalida o anterior.
- [ ] RH gera código: exibido uma única vez; refresh da página não mostra mais.
- [ ] `GET /employees` (admin) e `search` (portal) **nunca** expõem `accessCodeHash`.
- [ ] Funcionário inativado (`INACTIVE`) não loga, mesmo com código válido.
- [ ] Colaborador A não acessa calendário do colaborador B trocando o `employeeId` na URL (403).

---

## 3. Parte B — Calendário mensal com regras de data ✅ IMPLEMENTADA

Verificado: suíte 62/62 (matriz hoje/atraso/409/nota 500-501), E2E 4/4 no stack e builds verde. Baseline restaurado.

### 3.1 Biblioteca de calendário (pesquisa e recomendação)

Requisitos: grade mensal real, locale `pt-BR`, dias customizáveis (conteúdo por dia: status + botões), controle fino de `disabled`, leve para celular, compatível com React 18 + styled-components, sem jQuery.

| Biblioteca | Veredito |
|---|---|
| **`react-day-picker` (v9) + `date-fns` (locale `pt-BR`)** | **Recomendada.** Padrão da comunidade para date-pickers customizáveis; `modifiers`/`modifiersClassNames` e `components.Day` permitem renderizar Peguei/Não peguei dentro da célula; CSS próprio pequeno; funciona bem mobile; `date-fns` já resolve formatação pt-BR (`EEEE, d 'de' MMMM`). Instalar: `npm i react-day-picker date-fns`. |
| `react-calendar` | Reserva. Mais simples, mas customização de célula é mais limitada e o visual padrão exige mais override. |
| `FullCalendar` | Descartado: pesado para um check-in mensal simples; feito para agenda/eventos arrastáveis. |
| Manter cards atuais | Descartado: não é calendário mensal (pedido explícito) e não escala para mês cheio. |

Confirmar a versão exata no `npm` no momento da implementação (React 18 OK em ambas as candidatas). Estilizar com os tokens de `styles.ts` (`--teal`, `--wine`, `--line` etc., `docs/FRONTEND.md:109-128`), botões ≥44px (`DayCheckin.tsx:107` já usa esse padrão — manter).

### 3.2 Regras de interação (fonte visual; backend decide — §3.3)

Referência "hoje" = relógio da VPS em `America/Sao_Paulo` (mesma regra de `docs/API.md:19` e `services/date-rules.ts`). O frontend usa `dateKeyInSaoPaulo()` apenas como palpite visual.

Estado de cada dia do mês (só dias **com lançamento**, `quantity > 0` — inalterado):

| Caso | Visual | Ação |
|---|---|---|
| Dia == hoje, `PENDING`, período `OPEN` | célula destacada "HOJE", botões ativos + campo opcional "observação" | 1 clique em Peguei/Não peguei; observação opcional (≤500) |
| Dia < hoje, `PENDING`, período `OPEN` | selo "ATRASADO" | Abre mini-formulário: botões + **caixa de comentário obrigatória** (máx. 500) → salva com `note` |
| Dia > hoje | desabilitado ("disponível no dia") | nenhuma — **sem furo**: nem clique, nem API |
| Dia sem lançamento | célula neutra/vazia | nenhuma ("sem almoço lançado") |
| Período `CLOSED` (qualquer dia) | somente leitura + selo "período fechado" | nenhuma |
| Dia já confirmado | mostra status + nota (se houver) | sem troca pelo portal — texto "para alterar, fale pessoalmente com o RH" |

Navegação entre meses mantida (`EmployeeCalendar.tsx:58-66`): pode ver passado; próximo mês além do atual continua bloqueado.

### 3.3 API — validações (fonte final, sem exceção)

`POST /employee-portal/:employeeId/checkin` com `{ date, status, note? }`:

1. Token portal válido + `employeeId` do token == rota, senão 403.
2. `date` futura (vs. São Paulo, `isFutureDate`) → **422** "Não é possível confirmar data futura" (regra já existe em `employee-portal.ts:125-127` — manter e estender para qualquer origem, não só portal).
3. Período `CLOSED` → **422** (já existe, `employee-portal.ts:145-147`).
4. `note` sempre aceita como observação (opcional, ≤500). Se `date < hoje` (marcação atrasada), `note` **obrigatória** (não-vazia) → senão **422** "Justificativa obrigatória para marcação atrasada".
5. Dia já confirmado (`confirmationStatus != PENDING`) → **409** "Confirmação já registrada. Para alterar, fale pessoalmente com o RH."
6. Sem `MealRecord` com `quantity > 0` → 404 (já existe).
7. Persiste `confirmationNote = note ?? null`, `confirmationSource = SISTEMA`, `confirmedAt = NOW()`; emite `meal-confirmation:updated` com a nota incluída no payload (gestora vê justificativa/observação no painel "Verificar quem Pegou").
8. Auditoria inclui `isLate: true/false` + `note` no metadata.

`GET calendar` passa a retornar por dia: `{ ..., confirmationNote, isLate, period: { status } }` para o frontend renderizar sem cálculo próprio.

### 3.4 Cenários de aceite — Parte B (exemplo com "hoje = dia 24")

- [ ] Dia 24 (hoje): botões ativos + campo opcional "observação"; 1 clique salva com ou sem observação.
- [ ] Dia 24 já confirmado: botões somem, texto "para alterar, fale pessoalmente com o RH"; POST direto → 409.
- [ ] Dia 23 (ontem, pendente): clicar abre justificativa; **salvar sem texto é bloqueado** no frontend E na API (teste direto na API com `note` vazia → 422).
- [ ] Dia 25 (amanhã): célula desabilitada; POST direto na API com data futura → 422.
- [ ] Dia 24 de período `CLOSED`: somente leitura.
- [ ] Dia sem lançamento: sem botões, texto "sem almoço lançado".
- [ ] Gestora com painel aberto recebe `meal-confirmation:updated` de marcação atrasada **com a justificativa visível**.
- [ ] Nota com 501 caracteres → 422; com 500 → 200.
- [ ] Mobile 360px: grade mensal legível, células tocáveis sem zoom, botões ≥44px.

---

## 4. Parte C — Períodos anuais ✅ IMPLEMENTADA

Verificado: suíte 5/5 do gerador (12 mensais, virada de ano, bissexto corte 1, 409 atômico, 422), E2E 6/6 no stack e builds verde. Baseline restaurado.

### 4.1 O que já existe (sem código novo)

Backend aceita qualquer intervalo (`startDate <= endDate`, `billing-periods.ts:29-52`); dashboard/relatório agregam por período (`calculatePeriodSummary`). Ou seja: **criar um período `2026-01-01 → 2026-12-31` já funciona hoje**. O que falta é UX + disciplina para a gestora não esquecer.

### 4.2 Proposta (duas formas, RH escolhe por caso)

**C1 — Período anual único** (ex: rótulo `2026`, 01/01→31/12): relatório/XLSX anual sai direto. Bom para visão consolidada; ruim para fechamento mensal (fechar o ano trava o ano todo — documentar o trade-off na tela).

**C2 — Gerador "ano → 12 mensais" (recomendado para a rotina):** novo painel em `PeriodsPage`:
- Entradas: `ano` (ex: 2026) + `dia de corte` (padrão **06**, travado com o RH — ciclo 06→05) + prefixo de rótulo.
- Preview dos 12 intervalos antes de criar (ex: `Janeiro 2026 - 06/01 a 05/02`, …, `Dezembro 2026 - 06/12 a 05/01/2027`).
- Validação: nenhum dos 12 pode **sobrepor** período existente (mesma checagem de intervalo, erro lista quais conflitam); criação é atômica (tudo ou nada) via novo endpoint:
  - `POST /billing-periods/bulk-year` (`RH`, Zod: `{ year, cutDay 1-28, labelPrefix? }`) → `{ periods: [...] }` + `AuditLog BULK_CREATE_YEAR`.
- Regra do corte: `cutDay` 1–28 (evita fevereiro quebrado); período mensal N = `cutDay/M-ano → (cutDay-1)/(M+1)`; dezembro avança o ano.

### 4.3 Cenários de aceite — Parte C

- [ ] Gerar 2027 com corte 06: 12 períodos criados, rótulos e intervalos corretos, sem sobreposição.
- [ ] Gerar ano que conflita com mês existente: **nada é criado**, erro cita os períodos conflitantes.
- [ ] `cutDay = 31`: rejeitado (422) com mensagem explicando o limite 1–28.
- [ ] Período anual único 2026: dashboard e XLSX consolidam o ano; fechar o ano bloqueia lançamentos/check-ins do ano todo (aviso explícito na confirmação de fechamento).
- [ ] `openapi.ts` + `docs/API.md` atualizados para `bulk-year`.

---

## 5. Migração e carga de dados

1. Aplicar migration (A + nota) em dev → validar → backup produção → `prisma migrate deploy` (rito de `docs/BANCO-DE-DADOS.md:132-148`).
2. Colaboradores entram **via banco depois** (pedido): roteiro documentado — `INSERT` com `status ACTIVE` + geração de códigos pelo botão "Gerar códigos pendentes" em Funcionários (lista única para distribuição). Implementado como endpoint `POST /employees/access-codes/batch` em vez de script npm.
3. Códigos nunca transitam por e-mail/planilha versionada; entrega RH→colaborador por canal direto.
4. `MealRecord.confirmationNote` nulável: histórico atual intacto; marcações antigas exibem "sem justificativa".

## 6. Testes (amarra Fase 2 do PLANO-PROXIMO-CICLO)

- `resolveMealPrice` e `calculatePeriodSummary` inalterados, mas `checkin` ganha matriz de casos: hoje sem nota OK / hoje com observação OK / passado sem nota 422 / passado com nota OK / futuro 422 / fechado 422 / dia já confirmado 409 / token de outro funcionário 403 / nota >500 422.
- Login do portal: código certo emite token 8h; tentativas além do limite disparam 429; hash nunca vaza em nenhuma resposta (assert em `search`, `calendar`, `employees`).
- Gerador anual: 12 intervalos para corte 06/2027 (incluindo virada de ano em dezembro); sobreposição aborta tudo; corte 31 rejeitado.

## 7. Documentação a atualizar (rito de `docs/CONTRIBUICAO.md` + `docs/ARQUITETURA.md:71-76`)

- `docs/API.md` + `backend/src/docs/openapi.ts`: `login`, `access-code` (PUT/DELETE), `bulk-year`, campo `note`, token portal, erros 422/403 novos.
- `docs/BANCO-DE-DADOS.md`: novas colunas, script de códigos, roteiro de carga de colaboradores via banco.
- `docs/SEGURANCA.md`: fim do acesso só-por-nome; política do código; rate-limit do portal; código exibido uma vez.
- `docs/FRONTEND.md`: `react-day-picker` + `date-fns`, estrutura `components/employee-portal/` (novo `AccessCodeStep`, `LateCheckinForm`), sessão do portal (token 12h em memória/`sessionStorage` — nunca `localStorage` permanente).
- `docs/VISAO-GERAL.md` + `ARQUITETURA.md`: regra "só hoje clica / atraso exige justificativa / futuro bloqueado" e "períodos anuais + gerador".

## 8. Ordem de execução

1. **A-banco+API** (migration, login, token, CRUD de código, rate-limit) → 2. **A-admin** (EmployeesPage) → 3. **A-portal login** (etapa código) → 4. **B-calendário** (lib + regras + nota) → 5. **C-períodos** (bulk-year + UI) → 6. **Carga real** (colaboradores + códigos) → 7. **Docs+testes** (contínuo, não no fim).
- C pode começar após (1) se houver paralelismo; B exige A pronto (token).

## 9. Decisões — TRAVADAS com o RH

1. ✅ Formato do código: **6 dígitos**.
2. ✅ Troca de confirmação: **sem troca pelo portal** — para alterar, colaborador fala **pessoalmente** (ajuste via admin, se preciso).
3. ✅ Nota: campo **sempre disponível** como observação, **obrigatório apenas em atraso**.
4. ✅ Dia de corte padrão do gerador: **06** (ciclo 06→05).
5. ✅ Validade do token portal: **8h** (um turno).
6. ✅ Distribuição: **lista imprimível no sistema**, exibida uma única vez na geração em lote; RH entrega dentro da empresa; perdeu → reemissão.

## 10. Critérios de pronto (geral)

- [ ] Todos os aceites de A (§2.5), B (§3.4) e C (§4.3) verdes.
- [ ] `npm run build` passa em backend e frontend; `tsc` sem erro.
- [ ] Nenhum segredo/hash/código em log, resposta ou Git (`docs/CONTRIBUICAO.md:135-145`).
- [ ] Docs da §7 atualizadas no mesmo PR.
- [ ] Conferido no aglomerado local (`docker-compose.local.yml`: portal, admin, períodos) antes de subir para a VPS.
