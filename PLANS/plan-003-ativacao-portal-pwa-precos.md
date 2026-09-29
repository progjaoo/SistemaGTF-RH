# PLAN-003 — Ativação do portal + PWA do colaborador + CRUD completo de preços — Implementation Plan

**Status:** implementado e verificado (A1/A2/A3/B1/B2/B3: suíte 77/77, E2E 8/8 no stack, PWA ativo, builds verdes, baseline restaurado).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Colaborador entra com o código uma vez e fica ativo (status visível ao RH, sessão persistida no aparelho, portal instalável como PWA); RH passa a ver qual preço está vigente e gerencia vigências com CRUD completo e seguro.

**Architecture:** Parte A (portal) e Parte B (preços) independentes — podem executar em qualquer ordem. Backend continua fonte final (ativação, expiração, sobreposição de vigências, histórico fechado imutável). PWA só envolve o frontend (`/colaborador/`) + Nginx (MIME/headers já padrão).

**Tech Stack:** Backend Express/Prisma (existente); frontend React 18 + Vite 6 + Tailwind v4; `vite-plugin-pwa` (novo), `sharp` (dev, gerar ícones); restante inalterado.

**Spec:** Este arquivo. Decisões do RH já embutidas: (1) código mantido, com "manter conectado"; (2) ativação na primeira entrada (pendente → ativo); (3) PWA do portal para baixar; (4) preços com status vigente/não + CRUD completo.

## Global Constraints

- Zero mudanças em regras de lançamento, fechamento e cálculo (só leitura reutilizada).
- Histórico de período `CLOSED` imutável — nenhuma edição de preço pode reescrever passado fechado.
- Nenhum segredo/hash/código em log, resposta ou Git; `npm run build` + `tsc` verdes por task.
- Mobile-first no portal; toque ≥44px; sessão do portal nunca em `localStorage` sem consentimento ("manter conectado").
- PWA respeita `VITE_BASE_PATH` (produção serve em `/sistema-rh/`).

## Review Focus

- Token de 30 dias roubado via XSS no portal: o que um script injetado consegue fazer com ele (só check-in do próprio funcionário — validar escopo amarrado).
- Sobreposição de vigências que o validador deixa passar (fronteira `validTo` inclusiva vs exclusiva em datas iguais).
- PWA instalável de verdade: start_url dentro do scope sob subcaminho, ícones 192/512 presentes, SW não cacheando POST/API.
- Preço editado com vigência que cruza período fechado: relatório congelado precisa continuar idêntico.
- Ativação dupla simultânea (dois aparelhos, primeiro login): sem corrida que quebre auditoria.

## Scope Check

Duas entregas independentes (A: portal/PWA; B: preços), cada uma com software funcionando e testável ao fim. Arquivo único por convenção do repo (`PLANS/`), com dependências explícitas por task.

---

## File Structure

**Parte A — ativação + persistência + PWA:**
- `backend/prisma/schema.prisma` (+ migration `add_portal_activation`): `Employee.firstPortalAccessAt DateTime?`
- Modify `backend/src/routes/employee-portal.ts`: login aceita `remember?`, expiração 8h/30d, ativa no primeiro acesso, retorna `portalStatus`.
- Modify `backend/src/routes/employees.ts`: serialize inclui `portalAccess: "none" | "pending" | "active"`.
- Modify `frontend/src/pages/EmployeePortalPage/index.tsx`: checkbox "manter conectado", `localStorage` vs `sessionStorage`.
- Modify `frontend/src/pages/EmployeesPage/index.tsx`: coluna "Acesso portal" com 3 estados.
- Create `frontend/public/` icons (via script), modify `frontend/vite.config.ts` (plugin PWA), create `scripts/gen-pwa-icons.mjs`, modify `frontend/src/pages/EmployeePortalPage` (prompt de instalação).

**Parte B — preços:**
- Modify `backend/src/routes/meal-prices.ts`: `status` computado, `PUT /:id`, `POST /:id/close`, validação de sobreposição, trava de histórico fechado.
- Modify `frontend/src/pages/PricesPage/index.tsx`: badges de status, editar/encerrar, filtros.
- Modify `backend/src/docs/openapi.ts`, `docs/API.md`, `docs/BANCO-DE-DADOS.md`, `docs/FRONTEND.md`, `docs/DEPLOY-VPS.md` (PWA), `agents/*` afetados.
- Tests: `backend/tests/api/portal-activation.test.ts`, `backend/tests/api/prices-crud.test.ts` (+ E2E manual no aglomerado).

---

### Task A1: Ativação no backend (migration + login + status)

**Files:**
- Modify: `backend/prisma/schema.prisma` (+ nova migration via `migrate dev` em banco temp, rito das Fases anteriores)
- Modify: `backend/src/routes/employee-portal.ts`
- Modify: `backend/src/routes/employees.ts`
- Test: `backend/tests/api/portal-activation.test.ts`

**Interfaces:**
- Consumes: `authenticatePortal`, rate-limit do login, `AuditLog` (padrões existentes).
- Produces: `portalStatus: "pending" | "active"` no login; `portalAccess` no serialize de funcionário; expiração `8h | 30d`.

- [ ] **Step 1: Migration (banco temp, nunca editar aplicada)**

```bash
docker compose -f docker-compose.local.yml exec -T postgres psql -U postgres -c 'CREATE DATABASE sistema_rh_migtemp;'
cd backend
DATABASE_URL='postgresql://postgres:postgres@localhost:5433/sistema_rh_migtemp?schema=public' npx prisma migrate dev --name add_portal_activation
```

Schema:

```prisma
firstPortalAccessAt DateTime? // null = acesso ainda não ativado (pendente)
```

Depois: `docker compose ... -c 'DROP DATABASE sistema_rh_migtemp;'`. Expected: pasta `backend/prisma/migrations/*_add_portal_activation/` com `ADD COLUMN "firstPortalAccessAt"`.

- [ ] **Step 2: Teste failing — login ativa e expira conforme remember**

```ts
// backend/tests/api/portal-activation.test.ts
it("primeiro login ativa (pending -> active) e segundo mantém", async () => {
  // gera código via PUT /employees/:id/access-code (RH)
  // login sem remember → decodifica exp - iat ≈ 8h; firstPortalAccessAt preenchido
  // login com remember → exp - iat ≈ 30d
});
it("sem código → 401; funcionário INACTIVE → 401 mesmo com código", async () => { /* ... */ });
```

Run: `npm test -- tests/api/portal-activation.test.ts`
Expected: FAIL (`firstPortalAccessAt` não existe / `remember` ignorado).

- [ ] **Step 3: Implementar no `employee-portal.ts`**

```ts
const portalLoginSchema = z.object({
  employeeId: z.string(),
  code: z.string().regex(/^\d{6}$/),
  remember: z.boolean().optional().default(false),
});
// no handler, após bcrypt.compare OK:
const isFirst = !employee.firstPortalAccessAt;
const [updated] = await prisma.$transaction([
  ...(isFirst ? [prisma.employee.update({
    where: { id: employee.id }, data: { firstPortalAccessAt: new Date() }
  })] : []),
  prisma.auditLog.create({ data: {
    entity: "Employee", entityId: employee.id,
    action: isFirst ? "PORTAL_ACTIVATED" : "PORTAL_LOGIN",
    metadata: { ip: req.ip ?? null, remember: input.remember }
  } }),
]);
const token = jwt.sign({ sub: employee.id, scope: "employee-portal" },
  config.jwtSecret, { expiresIn: input.remember ? "30d" : "8h" });
res.json({ token, employee: { id, name }, portalStatus: "active" });
```

Regra: `remember` só estende expiração — escopo continua `employeeId` próprio; logout (limpar token no aparelho) continua sendo a revogação do usuário; RH revoga via `DELETE access-code` (já existe).

- [ ] **Step 4: Expor `portalAccess` no serialize de funcionário (`employees.ts`)**

```ts
portalAccess: !employee.accessCodeHash ? "none"
  : !employee.firstPortalAccessAt ? "pending" : "active",
```

Selecionar `firstPortalAccessAt` onde o serialize recebe a linha (sem expor hash — já garantido).

- [ ] **Step 5: Verificar**

Run: `npm test -- tests/api/portal-activation.test.ts` → PASS; `npm run build` → `tsc` sem erro; suite completa `npm test` verde.

- [ ] **Step 6: Commit**

```bash
git add backend/prisma backend/src/routes/employee-portal.ts backend/src/routes/employees.ts backend/tests/api/portal-activation.test.ts
git commit -m "feat(portal): ativacao no primeiro acesso e sessao de 30d com lembrar"
```

### Task A2: Portal persiste no aparelho + admin mostra 3 estados

**Files:**
- Modify: `frontend/src/pages/EmployeePortalPage/index.tsx`, `frontend/src/api.ts` (login com `remember`), `frontend/src/pages/EmployeesPage/index.tsx`, `frontend/src/types.ts` (`portalAccess`)

**Interfaces:**
- Consumes: Task A1 (`portalStatus`, expiração 30d).
- Produces: sessão 30d em `localStorage` OU 8h em `sessionStorage`; coluna de acesso com 3 estados.

- [ ] **Step 1: Checkbox + storage duplo no portal**

```tsx
const [remember, setRemember] = useState(false);
// no submitCode:
const response = await api.employeePortalLogin(selectedEmployee.id, code, remember);
const storage = remember ? localStorage : sessionStorage;
storage.setItem(TOKEN_KEY, response.token);
storage.setItem(EMPLOYEE_KEY, JSON.stringify(response.employee));
```

`loadSession()` lê `localStorage` primeiro, depois `sessionStorage`; `clearSession()` limpa ambos. Texto ao lado do checkbox: "Manter conectado neste aparelho (30 dias)".

- [ ] **Step 2: Coluna de acesso no admin** — `hasAccessCode` continua; adicionar `portalAccess` ao tipo `Employee` e exibir `Sem acesso | Pendente | Ativo` (badge muted/warn/good).
- [ ] **Step 3: Verificar**

Run: `npm run build` → `✓ built`. No aglomerado: gerar código → admin mostra Pendente → login com lembrar → admin mostra Ativo → fechar aba, reabrir `/colaborador` direto entra sem código → logout/sair pede código de novo.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/EmployeePortalPage frontend/src/api.ts frontend/src/pages/EmployeesPage frontend/src/types.ts
git commit -m "feat(portal): manter conectado e status de ativacao no admin"
```

### Task A3: PWA instalável do portal

**Files:**
- Modify: `frontend/package.json`, `frontend/vite.config.ts`
- Create: `scripts/gen-pwa-icons.mjs`, `frontend/public/pwa-192.png`, `frontend/public/pwa-512.png`, `frontend/public/maskable-512.png`
- Modify: `frontend/src/pages/EmployeePortalPage/index.tsx` (prompt `beforeinstallprompt`), `docs/DEPLOY-VPS.md`, `docs/FRONTEND.md`

**Interfaces:**
- Consumes: rota `/colaborador/` existente; `VITE_BASE_PATH` (produção `/sistema-rh/`).
- Produces: manifest + SW registrados; ícones versionados (fora do Git se gerados no build? NÃO — versionar, são estáveis).

- [ ] **Step 1: Instalar e configurar**

```bash
cd frontend
npm install -D vite-plugin-pwa sharp
```

```ts
// vite.config.ts (adicionar ao plugins)
import { VitePWA } from "vite-plugin-pwa";
const basePath = process.env.VITE_BASE_PATH ?? "/";
VitePWA({
  registerType: "prompt",
  manifest: {
    name: "GTF - Controle de Almoços",
    short_name: "GTF Almoço",
    start_url: `${basePath}colaborador/`,
    scope: `${basePath}colaborador/`,
    display: "standalone",
    background_color: "#EFF8F7",
    theme_color: "#1E8C86",
    icons: [
      { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
      { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
      { src: "maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  },
  workbox: {
    // API nunca cacheada: só navegação/documentos do portal
    runtimeCaching: [{
      urlPattern: ({ url }) => url.pathname.includes("/api/"),
      handler: "NetworkOnly"
    }]
  }
})
```

Atenção: `scope` restrito a `/colaborador/` — navegação fora dele abre no browser (aceitável e desejado: PWA é só o portal).

- [ ] **Step 2: Gerar ícones do logo (`scripts/gen-pwa-icons.mjs`, sharp a partir de `frontend/src/images/logogtf.png`)**

Run: `node scripts/gen-pwa-icons.mjs` → Expected: 3 PNGs em `frontend/public/` (>0 bytes cada, dimensões conferidas via `sharp metadata` no próprio script).

- [ ] **Step 3: Prompt de instalação no portal** — botão "Instalar app" visível só quando o evento `beforeinstallprompt` disparar (guardar o evento, `prompt()` no clique); fallback: instruções "Adicionar à tela inicial".
- [ ] **Step 4: Verificar**

Run: `npm run build` → `dist/manifest.webmanifest` + `sw.js` presentes. No aglomerado (HTTP = instalável só em localhost, que é o caso): DevTools → Application → Manifest sem erro; Lighthouse PWA com checklist verde exceto HTTPS. Documentar em `DEPLOY-VPS.md` que produção já tem HTTPS (requisito ok).

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/vite.config.ts frontend/public scripts/gen-pwa-icons.mjs frontend/src/pages/EmployeePortalPage docs/DEPLOY-VPS.md docs/FRONTEND.md
git commit -m "feat(portal): PWA instalavel do colaborador"
```

### Task B1: CRUD completo de preços no backend

**Files:**
- Modify: `backend/src/routes/meal-prices.ts`, `backend/src/docs/openapi.ts`
- Test: `backend/tests/api/prices-crud.test.ts`

**Interfaces:**
- Consumes: `resolveMealPrice`, `AuditLog`, trava de período `CLOSED`.
- Produces: `status` por preço; `PUT /:id`; `POST /:id/close`; regra sem-sobreposição; sem DELETE.

Regras travadas (princípio: histórico fechado imutável):
1. `GET /` retorna `status`: `VIGENTE` (`validFrom <= hoje <= validTo?`), `FUTURA`, `ENCERRADA` (hoje em SP).
2. `PUT /:id` (RH): edita valor/vigência/escopo; 422 se sobrepuser outra vigência do **mesmo escopo** (global × global, funcionário × mesmo funcionário); 409 se a vigência antiga **cruza período CLOSED** (reescreveria relatório congelado).
3. `POST /:id/close` (RH) corpo `{ endDate }`: define `validTo` (encerra vigência sem apagar); 422 se `endDate < validFrom`.
4. Sem DELETE: histórico de preços alimenta relatórios fechados; encerrar é o caminho.

- [ ] **Step 1: Testes failing**

```ts
it("lista com status VIGENTE/FUTURA/ENCERRADA", ...);
it("PUT com sobreposição no mesmo escopo → 422", ...);
it("PUT em preço que cruza período CLOSED → 409", ...);
it("POST /:id/close define validTo e mantém histórico", ...);
it("global e individual não conflitam entre si", ...);
```

Run: `npm test -- tests/api/prices-crud.test.ts` → Expected: FAIL (rotas não existem).

- [ ] **Step 2: Implementar** (helper `overlapsSameScope(prices, {employeeId, validFrom, validTo, ignoreId})` + checagem de `BillingPeriod` CLOSED com `[startDate,endDate]` ∩ `[validFrom,validTo]`).
- [ ] **Step 3: Verificar** → PASS + `npm run build` + suite verde.
- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/meal-prices.ts backend/src/docs/openapi.ts backend/tests/api/prices-crud.test.ts
git commit -m "feat(precos): CRUD completo com status e trava de historico"
```

### Task B2: Tela de preços com vigência e ações

**Files:**
- Modify: `frontend/src/pages/PricesPage/index.tsx`, `frontend/src/api.ts`, `frontend/src/types.ts` (`status`)

**Interfaces:**
- Consumes: Task B1.
- Produces: tabela com badge VIGENTE (good) / FUTURA (info) / ENCERRADA (muted), escopo, editar, encerrar (Dialog com data), filtros por escopo; sem botão excluir (texto explicando: "preços alimentam relatórios fechados; encerre a vigência").

- [ ] **Step 1: Implementar** (form reutilizado para criar/editar; Dialog de encerramento com `endDate`; filtro global/por funcionário).
- [ ] **Step 2: Verificar** → `npm run build` + E2E no aglomerado: criar futura → badge FUTURA; editar valor de vigente; encerrar → ENCERRADA; tentar sobrepor → erro 422 visível; relatório de período fechado inalterado após edições.
- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/PricesPage frontend/src/api.ts frontend/src/types.ts
git commit -m "feat(precos): tela com status de vigencia e encerrar"
```

### Task B3/A4: Docs, agentes e E2E final

- [ ] **Step 1:** `docs/API.md` (login `remember`, `portalAccess`, preços `status/PUT/close`), `docs/BANCO-DE-DADOS.md` (`firstPortalAccessAt`, roteiro de carga + códigos), `docs/SEGURANCA.md` (token 30d: escopo e revogação), `docs/FRONTEND.md` (PWA + sessão), `agents/*` afetados.
- [ ] **Step 2:** E2E no aglomerado: ciclo completo (gerar código → pendente → login lembrar → ativo → fechar app → reabrir direto → revogar → 401) + ciclo preços (criar/editar/encerrar + relatório fechado intacto) + PWA (manifest + install prompt).
- [ ] **Step 3: Commit** docs.

## Self-review (executado na escrita)

1. **Spec coverage:** ativação (A1/A2), persistência 30d (A1/A2), PWA instalável (A3), preços status+CRUD+travas (B1/B2), docs+E2E (B3/A4). Sem requisito órfão.
2. **Placeholder scan:** sem TBD/TODO; comandos e código presentes; sem "similar à Task N".
3. **Type consistency:** `portalStatus` (login) vs `portalAccess` (admin) — nomes diferentes de propósito (contexto distinto), ambos documentados; `remember: boolean`, expirações `"8h"|"30d"`; `status: VIGENTE|FUTURA|ENCERRADA` nos dois lados.
4. **Review Focus:** 5 itens mapeados — escopo do token (testes A1 + E2E), fronteira de vigência (testes B1), PWA (Steps A3-4), relatório congelado (testes B1 + E2E), corrida de ativação (transação em A1 Step 3).
