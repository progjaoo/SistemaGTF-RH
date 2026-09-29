# PLAN-002 — Migração visual total: Tailwind + shadcn + Radix + paleta Genesis — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar o frontend inteiro de styled-components para Tailwind v4 + shadcn + Radix com a paleta Genesis, trocar Inter por Outfit, instalar toasts (login/logout incluídos) e remover o `notice` legado e o styled-components, sem mudar nenhuma regra de negócio, API ou banco.

**Architecture:** Fundação primeiro (deps, plugin Vite, alias `@/*`, tema CSS, `cn()`, shadcn via CLI); depois camadas de fora para dentro (Toaster → Login → Shell → páginas → portal); remoção do legado por último. styled-components e Tailwind convivem durante a migração; cada estágio termina com build verde e software funcionando.

**Tech Stack:** React 18.3.1, Vite 6.4.3, Tailwind CSS v4 (`@tailwindcss/vite`), shadcn new-york, Radix primitives, `sonner` (toaster), `@fontsource/outfit`, `clsx` 2.1.1 (já instalado) + `tailwind-merge`, `class-variance-authority`, lucide-react (mantido).

**Spec:** Este arquivo + decisões travadas: (1) migração real, não adapter; (2) login fundo escuro deep-teal, painel branco; (3) Outfit via npm; (4) toasts substituem 100% o `notice`; (5) escopo total §2–§8. Modelo visual: paleta Genesis (teal `#2BA8A2` dominante, gold/coral pontuais, cream/sky/success/error conforme §3 do plano anterior).

## Global Constraints

- Backend, API e banco: zero mudanças (nenhum arquivo fora de `frontend/` exceto `docs/` no fim).
- `VITE_API_URL` e `VITE_BASE_PATH` continuam injetados no build; produção segue `docs/DEPLOY-VPS.md`.
- Nenhum segredo em código; nenhum `any` novo; `tsc` estrito (`strict: true`, `noEmit: true`).
- Mobile <768px: coluna única, sem scroll horizontal; toque ≥44px no portal.
- `prefers-reduced-motion` respeitado; sem `h-screen` (sempre `min-h-[100dvh]`); sem emoji; sem roxo/neon.
- Branch de trabalho dedicado; merge só com regressão verde no aglomerado local.

## Review Focus

- Token teal sobre fundo branco e texto sobre deep-teal: contraste AA real, não "parece ok" — checar pares exatos.
- Toast de logout disparando antes da sessão limpar vs depois (ordem importa: limpar primeiro, toast depois, sem token vazado).
- `Dialog` do Radix com foco inicial e Esc: telas que usavam `window.confirm` não podem perder o bloqueio (reabrir período, revogar código).
- Grade de lançamentos e calendário do portal em 360px: toque sem zoom, sem texto vazado.
- Bundle: `vite build` não pode estourar 500kB por chunk sem code-split explícito.

---

## File Structure

**Criar:**
- `frontend/src/index.css` — `@import "tailwindcss"`, `@theme` Genesis, base (focus, scrollbar, reduced-motion).
- `frontend/src/lib/utils.ts` — `cn()` (clsx + tailwind-merge).
- `frontend/components.json` — config shadcn (style new-york, `@/*`, CSS vars off).
- `frontend/src/components/ui/button.tsx`, `input.tsx`, `label.tsx`, `badge.tsx`, `dialog.tsx`, `skeleton.tsx`, `checkbox.tsx`, `select.tsx`, `separator.tsx`, `sonner.tsx` — kit shadcn (via CLI, fallback manual).
- `frontend/src/components/feedback/Toaster.tsx` — wrapper fino se precisar de preset Genesis (opcional; preferir `sonner.tsx` do shadcn direto).

**Modificar (ordem):**
- `frontend/package.json` — novas deps.
- `frontend/vite.config.ts` — plugin tailwind + alias `@`.
- `frontend/tsconfig.json` — `paths: { "@/*": ["./src/*"] }`.
- `frontend/src/main.tsx` — importar `index.css` + `@fontsource/outfit/*` no lugar de `GlobalStyle`.
- `frontend/src/App.tsx` — `<Toaster/>`, toasts login/logout, remover `notice`/`Alert` (por último).
- `frontend/src/pages/LoginPage/index.tsx` — re-skin (estrutura intacta).
- `frontend/src/components/layout/*` — Shell, Sidebar, Topbar, Brand.
- `frontend/src/pages/DashboardPage/*`, `DashboardView.tsx`, `RecordsPage/*` (+`components/records/*`), `EmployeesPage/*`, `PricesPage/*`, `PeriodsPage/*`, `UsersPage/*`.
- Portal: `EmployeePortalPage/*`, `NameSearch.tsx`, `AccessCodeStep.tsx`, `EmployeeCalendar.tsx`, `DayCheckin.tsx` (re-tint day-picker via CSS vars, manter lógica).
- `frontend/src/styles.ts` — APAGAR (por último, quando zero imports restarem).
- `docs/FRONTEND.md`, `docs/STACK.md`, `agents/frontend-engineer.md` — documentar.

**Deletar (fase final):** `frontend/src/styles.ts`, dep `styled-components` + `@types/styled-components` do `package.json`.

---

### Task 0: Instalar dependências

**Files:**
- Modify: `frontend/package.json`

**Interfaces:**
- Consumes: nada.
- Produces: deps disponíveis para todas as tasks seguintes.

- [ ] **Step 1: Instalar**

```bash
cd frontend
npm install tailwindcss @tailwindcss/vite @fontsource/outfit class-variance-authority tailwind-merge sonner
npm install @radix-ui/react-dialog @radix-ui/react-label @radix-ui/react-slot @radix-ui/react-checkbox @radix-ui/react-select @radix-ui/react-separator
```

- [ ] **Step 2: Verificar instalação**

Run: `npm list tailwindcss @tailwindcss/vite sonner class-variance-authority tailwind-merge @fontsource/outfit --depth=0`
Expected: todas listadas, sem `ERESOLVE`. Se `ERESOLVE` no `@tailwindcss/vite` × Vite 6: fallback Tailwind v3 (`npm install tailwindcss@3 postcss autoprefixer`, criar `tailwind.config.js` + `postcss.config.js`, trocar `@import "tailwindcss"` por `@tailwind base; @tailwind components; @tailwind utilities` no `index.css`).

- [ ] **Step 3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "feat(frontend): adiciona Tailwind v4, shadcn/Radix, sonner e Outfit"
```

### Task 1: Configurar Vite + alias + shadcn

**Files:**
- Modify: `frontend/vite.config.ts`, `frontend/tsconfig.json`
- Create: `frontend/components.json`, `frontend/src/lib/utils.ts`, `frontend/src/index.css`, `frontend/src/components/ui/*`

**Interfaces:**
- Consumes: Task 0 (deps instaladas).
- Produces: `cn()` em `@/lib/utils`, tema Genesis carregado, componentes shadcn importáveis via `@/components/ui/*`.

- [ ] **Step 1: Editar `vite.config.ts` (arquivo completo)**

```ts
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  base: process.env.VITE_BASE_PATH ?? "/",
  server: {
    port: 5173,
    watch: {
      usePolling: false,
      ignored: ["**/node_modules/**", "**/dist/**", "**/.git/**"]
    }
  }
});
```

- [ ] **Step 2: Adicionar `paths` ao `tsconfig.json`** (dentro de `compilerOptions`, após `"jsx": "react-jsx"`)

```json
"baseUrl": ".",
"paths": { "@/*": ["./src/*"] }
```

- [ ] **Step 3: Criar `src/index.css`** (arquivo completo — tema Genesis é a fonte única de verdade)

```css
@import "tailwindcss";
@import "@fontsource/outfit/400.css";
@import "@fontsource/outfit/700.css";
@import "@fontsource/outfit/800.css";
@import "@fontsource/outfit/900.css";

@theme {
  --color-teal: #2BA8A2;
  --color-teal-hover: #3CC4BD;
  --color-teal-deep: #1E8C86;
  --color-teal-bg: #E8F6F5;
  --color-gold: #FFD23F;
  --color-gold-soft: #FFE47A;
  --color-gold-deep: #E6B800;
  --color-coral: #EF6C4A;
  --color-coral-deep: #D45233;
  --color-cream: #FFF8E7;
  --color-sky: #5DADE2;
  --color-paper: #EFF8F7;
  --color-success: #27AE60;
  --color-danger: #E74C3C;
  --color-ink: #20262c;
  --color-muted: #68717c;
  --color-line: #d9e0e6;
  --font-sans: "Outfit", ui-sans-serif, system-ui, sans-serif;
}

body {
  @apply bg-paper text-ink font-sans antialiased;
  background-image: linear-gradient(90deg, rgb(43 168 162 / 0.08) 0 1px, transparent 1px 100%);
  background-size: 42px 42px;
}

button { cursor: pointer; }
button:active:not(:disabled) { transform: scale(0.98); }

button:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible,
[role="dialog"]:focus-visible {
  outline: 3px solid rgb(43 168 162 / 0.35);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    transition-duration: 0.001ms !important;
  }
}
```

- [ ] **Step 4: Criar `src/lib/utils.ts`** (arquivo completo)

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 5: Criar `components.json`** (arquivo completo, na raiz de `frontend/`)

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/index.css",
    "baseColor": "neutral",
    "cssVariables": false
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

- [ ] **Step 6: Instalar componentes shadcn**

Run: `npx shadcn@latest add button input label badge dialog skeleton checkbox select separator sonner`
Expected: arquivos criados em `src/components/ui/*` importando de `@/lib/utils` e `lucide-react`. Se o CLI falhar (estrutura Vite): fallback manual — copiar cada componente de `https://ui.shadcn.com/docs/components/<nome>`, trocar `@/lib/utils` conforme Step 4 e remover referências a CSS vars (`bg-background` → tokens do `@theme`: `bg-surface text-ink border-line`).

- [ ] **Step 7: Trocar `main.tsx`** (arquivo completo)

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

Nota: `GlobalStyle` sai do render mas `styles.ts` permanece no disco até a Task 9 (telas legadas ainda o usam).

- [ ] **Step 8: Verificar fundação**

Run: `npm run build`
Expected: `✓ built in ...` sem erro. App abre visualmente idêntico (tokens antigos ainda vigoram via styled-components).

- [ ] **Step 9: Commit**

```bash
git add frontend/vite.config.ts frontend/tsconfig.json frontend/components.json frontend/src/index.css frontend/src/lib/utils.ts frontend/src/components/ui frontend/src/main.tsx frontend/package.json frontend/package-lock.json
git commit -m "feat(frontend): fundacao Tailwind v4 + shadcn + alias @ e tema Genesis"
```

### Task 2: Toaster global + toasts de login/logout

**Files:**
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: Task 1 (`sonner`, `@theme`).
- Produces: `<Toaster/>` montado; padrão de toast para as tasks seguintes.

- [ ] **Step 1: Montar `<Toaster/>` no `App`** (dentro do `return` principal, antes do `</Shell>`/fechamento; e no ramo sem sessão, antes de `<LoginPage/>`)

```tsx
import { Toaster } from "@/components/ui/sonner";

// ramo com sessão, dentro do return, após <Sidebar/> ou ao fim do <Main/>:
<Toaster position="top-center" toastOptions={{
  style: { background: "#FFFFFF", color: "#20262c", border: "1px solid #d9e0e6" }
}} />
```

Mobile: sonner usa `bottom-center` por padrão em telas pequenas — manter.

- [ ] **Step 2: Toast de login** (em `handleLogin`, após sessão criada)

```tsx
import { toast } from "sonner";
// após setSession(...):
toast.success(`Bem-vindo(a), ${session.user.name.split(" ")[0]}`);
```

Falha de login: erro inline no form permanece; somar `toast.error("Não foi possível entrar. Confira email e senha.")` no `catch` de `handleLogin` (verificar onde `handleLogin` trata erro — se o erro só aparece no `LoginPage`, adicionar o toast lá via callback ou manter inline + toast no App; escolher o ponto onde a mensagem existe).

- [ ] **Step 3: Toast de logout** (em `logout`, após limpar)

```tsx
const logout = () => {
  handleLogout();
  setDashboard(null);
  setQuantities({});
  toast.info("Sessão encerrada. Até logo!");
};
```

- [ ] **Step 4: Verificar**

Run: `npm run build` → `✓ built`. No aglomerado local: login RH mostra toast de boas-vindas com o primeiro nome; logout mostra toast; `notice`/`Alert` continuam existindo (remoção é Task 8).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat(frontend): toaster global e toasts de login/logout"
```

### Task 3: Re-skin do Login (estrutura intacta)

**Files:**
- Modify: `frontend/src/pages/LoginPage/index.tsx`

**Interfaces:**
- Consumes: Task 1 (tema), Task 2 (toast de erro).
- Produces: login 100% Genesis, mesma árvore e fluxo.

- [ ] **Step 1: Reescrever estilos com Tailwind, mantendo JSX e lógica** (mapeamento exato, sem reordenar nada)
  - `LoginLayout`: `grid min-h-[100dvh] place-items-center px-[clamp(18px,4vw,52px)]` + fundo `bg-[linear-gradient(135deg,#1E8C86_0%,#145e59_55%,#0c3a37_100%)` com glow teal/gold sutil (radial `rgb(255 210 63 / 0.06)`).
  - `LoginShell`: `grid md:grid-cols-[1.08fr_0.82fr] w-[min(1100px,100%)] overflow-hidden rounded-[28px] bg-[#0e2f2c] shadow-2xl` (mobile: 1 coluna, `rounded-[22px]`).
  - `LoginIntro`: texto branco; `span` em `text-teal-hover uppercase`; `strong` branco uppercase (mesmos clamps).
  - `LoginPanel`: `bg-surface rounded-r-[28px]` (mobile sem radius); form `w-[min(390px,100%)] grid gap-4`.
  - Labels `text-muted uppercase text-xs`; inputs `bg-cream border-line rounded-[10px] min-h-[45px] focus:border-teal`.
  - `LoginButton`: shadcn `Button` variant primary size lg (`bg-teal hover:bg-teal-hover text-white min-h-[52px] w-full`).
  - `LoginError`: `border-danger/30 bg-danger/5 text-danger` (manter `role="alert"` se existir; se não, adicionar).
- [ ] **Step 2: Verificar**

Run: `npm run build` → `✓ built`. Visual no aglomerado: screenshot lado a lado com versão anterior (estrutura igual); AA: texto branco sobre `#1E8C86` e branco sobre `#2BA8A2`; 360px sem scroll horizontal; `prefers-reduced-motion` sem transição.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/LoginPage/index.tsx
git commit -m "feat(frontend): login em Tailwind com paleta Genesis, estrutura intacta"
```

### Task 4: Migrar Shell (Sidebar, Topbar, Brand)

**Files:**
- Modify: `frontend/src/components/layout/*` (Shell, Sidebar, Brand, Topbar + Toolbar/Eyebrow/Main conforme existirem)

**Interfaces:**
- Consumes: Task 1 (tema, `cn`, shadcn `button`/`badge`/`separator`).
- Produces: moldura migrada; nenhuma prop muda (tabs, activeTab, user, onLogout intactos).

- [ ] **Step 1: Converter cada arquivo** (mapeamento: `Shell` → `div` grid com sidebar fixa; `Sidebar` → `nav bg-teal-deep text-white` com item ativo em `bg-white/10 border-l-2 border-gold`; `Topbar` → header `bg-surface border-b border-line`; avatar/iniciais em `bg-teal text-white`; botão Atualizar = shadcn primary sm; select de período = shadcn `select`).
- [ ] **Step 2: Verificar**

Run: `npm run build` → `✓ built`. Navegar as 6 tabs como RH e como gestora (3 tabs); sidebar colapsa; logout dispara o toast da Task 2.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/layout
git commit -m "feat(frontend): shell (sidebar/topbar) em Tailwind Genesis"
```

### Task 5: Migrar Dashboard

**Files:**
- Modify: `frontend/src/pages/DashboardPage/*`, `frontend/src/components/DashboardView.tsx`

**Interfaces:**
- Consumes: Task 4 (moldura).
- Produces: dashboard migrado; números e gráficos inalterados (Recharts só re-tint: eixo/tooltip via CSS vars se necessário).

- [ ] **Step 1: Converter** (cards → `bg-surface border border-line rounded-2xl`; métricas com `font-mono` para números; gráficos mantêm dados, tooltip com `bg-ink text-white`).
- [ ] **Step 2: Verificar**

Run: `npm run build` → `✓ built`. Totais conferem com `/billing-periods/:id/report` (regressão funcional, não só visual).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/DashboardPage frontend/src/components/DashboardView.tsx
git commit -m "feat(frontend): dashboard em Tailwind Genesis"
```

### Task 6: Migrar Lançamentos (grade + conferência + importação)

**Files:**
- Modify: `frontend/src/pages/RecordsPage/index.tsx`, `frontend/src/components/records/*` (inclui `styles.ts` local → apagar no fim da task), `frontend/src/components/records/SpreadsheetImport.tsx`

**Interfaces:**
- Consumes: Tasks 1–2 (tema, toasts); produz aviso: `window.confirm` daqui migra para `Dialog` na Task 9 se ainda existir nesta tela.
- Produces: grade migrada; `setNotice` desta tela viram `toast.*` (salvo/importado/warnings→`toast.warning`).

- [ ] **Step 1: Converter grade** (cards de funcionário com `QuantityControl` ≥44px; `RowWarning` em `border-coral text-coral-deep`; `DataTable` de conferência com coluna Obs mantida; painel `SpreadsheetImport` com `input`/`badge` shadcn e preview idêntico).
- [ ] **Step 2: Trocar notices por toasts** (`"Lançamentos salvos."` → success, `"...com alertas de jornada."` → warning, `"Planilha importada..."` → success).
- [ ] **Step 3: Verificar**

Run: `npm run build` → `✓ built`. No aglomerado: salvar grade, importar planilha de teste, abrir "Verificar quem Pegou" (realtime intacto); 360px sem texto vazado.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/RecordsPage frontend/src/components/records
git commit -m "feat(frontend): lancamentos em Tailwind Genesis com toasts"
```

### Task 7: Migrar Funcionários, Preços, Períodos e Usuários

**Files:**
- Modify: `frontend/src/pages/EmployeesPage/index.tsx`, `PricesPage/*`, `PeriodsPage/*`, `UsersPage/*`

**Interfaces:**
- Consumes: Tasks 1–2, `dialog` do kit.
- Produces: CRUDs migrados; `window.confirm` (reabrir período, revogar código, inativar) viram `Dialog` com foco inicial e Esc; modais de código (única exibição) e lista de distribuição mantêm comportamento idêntico (uma vez, imprimir, encerrar); gerador anual com preview dos 12.

- [ ] **Step 1: Converter as 4 telas** (forms com `Field`→shadcn `label`+`input`+erro abaixo; checkboxes seg–dom mantêm lógica `toggleWorkday`; selects de jornada/status com shadcn `select`; tabelas com shadcn `badge`/`button`).
- [ ] **Step 2: Trocar confirms por `Dialog`** (um por chamada: reabrir período com o aviso "voltará a ficar editável"; revogar código; inativar funcionário).
- [ ] **Step 3: Trocar notices por toasts** (salvo/inativado/gerado/revogado/importado de códigos).
- [ ] **Step 4: Verificar**

Run: `npm run build` → `✓ built`. No aglomerado: gerar código (modal única), lote com impressão, gerador anual com preview, reabrir com Dialog.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/EmployeesPage frontend/src/pages/PricesPage frontend/src/pages/PeriodsPage frontend/src/pages/UsersPage
git commit -m "feat(frontend): cadastros em Tailwind Genesis com dialogs e toasts"
```

### Task 8: Migrar o Portal do colaborador

**Files:**
- Modify: `frontend/src/pages/EmployeePortalPage/index.tsx`, `NameSearch.tsx`, `AccessCodeStep.tsx`, `EmployeeCalendar.tsx`, `DayCheckin.tsx`

**Interfaces:**
- Consumes: Tasks 1–2 (tema, toasts, day-picker já instalado).
- Produces: fluxo busca → código → calendário idêntico em comportamento; sessão segue em `sessionStorage`.

- [ ] **Step 1: Converter** (header com logo; busca; código com input 6 dígitos centralizado; calendário day-picker re-tint via `--rdp-accent-color: var(--color-teal)` + classes `day-late/day-closed` mapeadas para coral/muted; detalhe do dia com botões ≥44px e justificativa; mini-Toaster próprio fora do Shell para check-ins).
- [ ] **Step 2: Verificar**

Run: `npm run build` → `✓ built`. No aglomerado em 360px: fluxo completo com código (dia atual 1 clique, atraso exige justificativa, futuro bloqueado); sessão expirada volta ao código.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/EmployeePortalPage frontend/src/components/employee-portal
git commit -m "feat(frontend): portal do colaborador em Tailwind Genesis"
```

### Task 9: Remover o legado e documentar

**Files:**
- Modify: `frontend/package.json`, `frontend/src/App.tsx`
- Delete: `frontend/src/styles.ts`
- Modify: `docs/FRONTEND.md`, `docs/STACK.md`, `agents/frontend-engineer.md`

**Interfaces:**
- Consumes: Tasks 0–8 (zero imports restantes de styled-components).
- Produces: codebase só-Tailwind; docs sincronizadas.

- [ ] **Step 1: Confirmar zero uso**

Run: `grep -r "styled-components" frontend/src --include="*.tsx" --include="*.ts" | wc -l`
Expected: `0`. Se >0, migrar o restante antes de prosseguir (não apagar com uso vivo).

- [ ] **Step 2: Remover `notice`/`Alert` do `App.tsx`** (todos os `setNotice` restantes viram `toast.*`; apagar estado `notice`, import e bloco `Alert`).
- [ ] **Step 3: Desinstalar e apagar**

```bash
cd frontend
npm uninstall styled-components @types/styled-components
rm src/styles.ts
npm run build
```

Expected: `✓ built`.

- [ ] **Step 4: Greps de guarda** (todos devem retornar vazio)

```bash
grep -rn "from \"styled-components\"\|styled(" frontend/src --include="*.tsx" --include="*.ts" | wc -l
grep -rn "Inter" frontend/src frontend/index.html | wc -l
grep -rn "#0f766e\|#0b625b" frontend/src | wc -l
grep -rn "setNotice\|window.confirm" frontend/src --include="*.tsx" | wc -l
```

- [ ] **Step 5: Documentar** (`docs/FRONTEND.md`: Tailwind v4 + `@theme`, shadcn, tokens, toasts, `cn()`; `docs/STACK.md`: novas deps e scripts inalterados; `agents/frontend-engineer.md`: padrões novos no lugar dos de styled-components).
- [ ] **Step 6: Regressão final no aglomerado** (rebuild + fluxos críticos: login, grade+save, portal com código, importação, gerador anual, realtime de conferência).
- [ ] **Step 7: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/App.tsx frontend/src/styles.ts docs/FRONTEND.md docs/STACK.md agents/frontend-engineer.md
git commit -m "feat(frontend): remove styled-components e notice; documenta design system"
```

---

## Self-review (executado na escrita)

1. **Spec coverage:** login (Task 3), toasts entrada/saída (Task 2 + portal Task 8), kit shadcn (Tasks 1/6), todas as telas (Tasks 4–8), remoção styled-components/notice (Task 9), docs (Task 9). Paleta §3 do plano anterior virou `@theme` executável. Nenhum requisito órfão.
2. **Placeholder scan:** sem "TBD/TODO", sem "similar à Task N" (código repetido onde o executor lê fora de ordem: `cn()`, Toaster, comandos de verificação por task), sem "adicionar validação apropriada" (regras AA/44px/greps explícitas).
3. **Type consistency:** `@/lib/utils` e `@/*` idênticos em Tasks 1, 6 e nos imports (`@/components/ui/sonner`); `toast.*` com mesma assinatura em Tasks 2, 6–8; `notice` removido só na Task 9 para não quebrar telas ainda não migradas.
4. **Review Focus:** os 5 itens viraram verificações dentro das tasks (contraste na Task 3, ordem do toast no logout na Task 2, Dialog bloqueante na Task 7, 360px nas Tasks 3/6/8, bundle na Task 9 via alerta do build).

## Métricas de pronto (geral)

- [ ] `tsc` + `vite build` verdes em todas as tasks; nenhum `any` novo.
- [ ] Greps de guarda zerados (Task 9, Step 4).
- [ ] Toasts de login/logout/check-in ok desktop + 360px.
- [ ] Regressão funcional verde no aglomerado local.
- [ ] Docs e agente atualizados (Task 9, Step 5).
