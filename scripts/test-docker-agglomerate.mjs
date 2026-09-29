// Teste automatizado de alta fidelidade contra o aglomerado Docker local — Sistema RH Grupo GTF
// Testa contêineres:
//  - sistema-rh-api-test  (Express REST + WebSocket na porta 3333)
//  - sistema-rh-web-test  (Nginx SPA + PWA na porta 5173)
//  - sistema-rh-pg-test   (PostgreSQL 16 na porta 5433)

import { execSync } from "node:child_process";

const API_BASE = "http://localhost:3333/api";
const WEB_BASE = "http://localhost:5173";

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  \x1b[32m✔\x1b[0m ${message}`);
    passed++;
  } else {
    console.error(`  \x1b[31m✖ FAIL:\x1b[0m ${message}`);
    failed++;
  }
}

async function request(path, options = {}) {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  let data = null;
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/pdf") || contentType.includes("spreadsheetml") || contentType.includes("image/")) {
    data = await res.arrayBuffer();
  } else {
    const text = await res.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  return { status: res.status, headers: res.headers, data };
}

function parseJwt(token) {
  const base64Url = token.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(Buffer.from(base64, "base64").toString());
}

async function run() {
  console.log("\n=======================================================");
  console.log("   TESTES DO AGLOMERADO DE CONTÊINERES DOCKER LOCAL    ");
  console.log("   (sistema-rh-pg-test, api-test, web-test)            ");
  console.log("=======================================================\n");

  // -----------------------------------------------------------------
  // 1. Conectividade e Saúde dos Contêineres
  // -----------------------------------------------------------------
  console.log("1. Conectividade, Saúde e Assets PWA:");
  
  const health = await request("/health");
  assert(health.status === 200 && health.data?.ok === true, "API container healthcheck 200 OK (/api/health)");

  const openapi = await request("/docs.json");
  assert(openapi.status === 200 && openapi.data?.openapi, "Swagger/OpenAPI JSON disponível (/api/docs.json)");

  const webRoot = await request(`${WEB_BASE}/`);
  assert(webRoot.status === 200 && typeof webRoot.data === "string" && webRoot.data.includes("<div id=\"root\">"), "Web frontend servindo index.html na porta 5173");

  const manifest = await request(`${WEB_BASE}/manifest.webmanifest`);
  assert(
    manifest.status === 200 && manifest.data?.name === "GTF - Controle de Almoços",
    `PWA Web Manifest válido com nome: '${manifest.data?.name}'`
  );
  assert(
    manifest.data?.icons?.length >= 2,
    `PWA Manifest declara ${manifest.data?.icons?.length} ícones (192, 512, maskable)`
  );

  const sw = await request(`${WEB_BASE}/sw.js`);
  assert(sw.status === 200 && sw.data?.length > 0, "PWA Service Worker presente e servido com sucesso (/sw.js)");

  const pwaIcon192 = await request(`${WEB_BASE}/pwa-192.png`);
  assert(pwaIcon192.status === 200, "Ícone PWA 192x192 acessível (/pwa-192.png)");

  const pwaIcon512 = await request(`${WEB_BASE}/pwa-512.png`);
  assert(pwaIcon512.status === 200, "Ícone PWA 512x512 acessível (/pwa-512.png)");

  // Testar WebSocket do Realtime (Socket.IO está configurado estritamente com transports: ["websocket"])
  const wsResult = await new Promise((resolve) => {
    try {
      const ws = new WebSocket("ws://localhost:3333/api/socket.io/?EIO=4&transport=websocket");
      const timeout = setTimeout(() => {
        ws.close();
        resolve({ ok: false, reason: "timeout" });
      }, 4000);

      ws.onmessage = (event) => {
        clearTimeout(timeout);
        ws.close();
        resolve({ ok: true, data: event.data });
      };
      ws.onerror = (err) => {
        clearTimeout(timeout);
        resolve({ ok: false, reason: err.message });
      };
    } catch (e) {
      resolve({ ok: false, reason: e.message });
    }
  });
  assert(
    wsResult.ok && typeof wsResult.data === "string" && wsResult.data.includes("sid"),
    "Realtime Socket.IO via WebSocket handshake ativo e emitindo Session ID"
  );

  // -----------------------------------------------------------------
  // 2. Autenticação e RBAC (RH vs Gestora)
  // -----------------------------------------------------------------
  console.log("\n2. Autenticação e Regras de RBAC:");

  const rhLogin = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "rh@grupogtf.com.br", password: "Conquistas@07" }),
  });
  assert(rhLogin.status === 200 && rhLogin.data?.token, "Login RH efetuado com sucesso (token JWT emitido)");
  const rhToken = rhLogin.data?.token;

  const gestoraLogin = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "gestora@grupogtf.com.br", password: "Conquistas@07" }),
  });
  assert(gestoraLogin.status === 200 && gestoraLogin.data?.token, "Login Gestora efetuado com sucesso (token JWT emitido)");
  const gestoraToken = gestoraLogin.data?.token;

  // RBAC checks
  const gestoraCreateUser = await request("/users", {
    method: "POST",
    headers: { Authorization: `Bearer ${gestoraToken}` },
    body: JSON.stringify({ name: "Invasor", email: "invasor@test.com", password: "123", role: "RH" }),
  });
  assert(gestoraCreateUser.status === 403, "RBAC: Gestora é bloqueada de criar usuários (403)");

  const gestoraCreatePeriod = await request("/billing-periods", {
    method: "POST",
    headers: { Authorization: `Bearer ${gestoraToken}` },
    body: JSON.stringify({ label: "Período Invasor", startDate: "2026-10-01", endDate: "2026-10-31" }),
  });
  assert(gestoraCreatePeriod.status === 403, "RBAC: Gestora é bloqueada de criar períodos (403)");

  const gestoraCreatePrice = await request("/meal-prices", {
    method: "POST",
    headers: { Authorization: `Bearer ${gestoraToken}` },
    body: JSON.stringify({ value: 10, validFrom: "2026-10-01" }),
  });
  assert(gestoraCreatePrice.status === 403, "RBAC: Gestora é bloqueada de criar preços (403)");

  // -----------------------------------------------------------------
  // 3. Portal do Colaborador: Ciclo de Ativação e Check-in (PLAN-003)
  // -----------------------------------------------------------------
  console.log("\n3. Portal do Colaborador (Ativação, Persistência 30d e Regras):");

  // Criar funcionário de teste para validar ciclo do portal
  const createEmp = await request("/employees", {
    method: "POST",
    headers: { Authorization: `Bearer ${rhToken}` },
    body: JSON.stringify({ name: "Funcionario Teste Docker", scheduleType: "MON_FRI", workdays: [1, 2, 3, 4, 5] }),
  });
  assert(createEmp.status === 201 && createEmp.data?.employee?.id, "RH cria colaborador de teste com jornada [1,2,3,4,5]");
  const testEmpId = createEmp.data?.employee?.id;

  assert(createEmp.data?.employee?.portalAccess === "none", "Funcionário recém-criado tem portalAccess: 'none'");

  // RH gera código de acesso de 6 dígitos
  const setCode = await request(`/employees/${testEmpId}/access-code`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${rhToken}` },
    body: JSON.stringify({ code: "741852" }),
  });
  assert(setCode.status === 200 && setCode.data?.code === "741852", "RH define código de acesso numérico de 6 dígitos");

  // Verificar que lista de funcionários agora exibe portalAccess: "pending"
  const empList = await request(`/employees?search=Funcionario Teste Docker`, {
    headers: { Authorization: `Bearer ${rhToken}` },
  });
  const foundEmp = empList.data?.employees?.find((e) => e.id === testEmpId);
  assert(foundEmp?.portalAccess === "pending", "Status de acesso no RH reflete 'pending' após emissão do código (nunca logou)");

  // Busca pública no portal
  const portalSearch = await request(`/employee-portal/search?name=Funcionario Teste`);
  assert(
    portalSearch.status === 200 && portalSearch.data?.employees?.some((e) => e.id === testEmpId && e.hasAccess === true),
    "Busca pública no portal localiza colaborador com hasAccess: true sem expor hash"
  );

  // Primeiro login no portal com 'remember: true' (ativação)
  const portalLogin = await request("/employee-portal/login", {
    method: "POST",
    body: JSON.stringify({ employeeId: testEmpId, code: "741852", remember: true }),
  });
  assert(
    portalLogin.status === 200 && portalLogin.data?.portalStatus === "active",
    "Primeiro login no portal ativa acesso e retorna portalStatus: 'active'"
  );

  const portalToken = portalLogin.data?.token;
  assert(!!portalToken, "Token do portal emitido para o colaborador");

  // Verificar duração de 30 dias quando remember=true
  const decodedToken = parseJwt(portalToken);
  const durationSeconds = decodedToken.exp - decodedToken.iat;
  const durationDays = Math.round(durationSeconds / 86400);
  assert(durationDays === 30, `Token de sessão persistente tem expiração de 30 dias (calculado: ${durationDays} dias)`);

  // Verificar que status no admin agora é 'active'
  const empListAfterLogin = await request(`/employees?search=Funcionario Teste Docker`, {
    headers: { Authorization: `Bearer ${rhToken}` },
  });
  const foundActive = empListAfterLogin.data?.employees?.find((e) => e.id === testEmpId);
  assert(foundActive?.portalAccess === "active", "Status do acesso no RH reflete 'active' após primeiro login");

  // Colaborador consulta calendário
  const calendar = await request(`/employee-portal/${testEmpId}/calendar?month=2026-09`, {
    headers: { Authorization: `Bearer ${portalToken}` },
  });
  assert(calendar.status === 200 && Array.isArray(calendar.data?.days), "Colaborador consulta calendário mensal via token do portal");

  // Tentativa de check-in em data futura -> Bloqueio 422
  const futureCheckin = await request(`/employee-portal/${testEmpId}/checkin`, {
    method: "POST",
    headers: { Authorization: `Bearer ${portalToken}` },
    body: JSON.stringify({ date: "2099-01-01", status: "PEGUEI" }),
  });
  assert(futureCheckin.status === 422, "Check-in em data futura é rejeitado com 422 Unprocessable Entity");

  // RH revoga código de acesso
  const revokeCode = await request(`/employees/${testEmpId}/access-code`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${rhToken}` },
  });
  assert(revokeCode.status === 200, "RH revoga código de acesso do funcionário");

  // Tentativa de login após revogação -> 401
  const loginAfterRevoke = await request("/employee-portal/login", {
    method: "POST",
    body: JSON.stringify({ employeeId: testEmpId, code: "741852" }),
  });
  assert(loginAfterRevoke.status === 401, "Login após revogação é rejeitado com 401 Unauthorized");

  // -----------------------------------------------------------------
  // 4. Preços com Vigência, Trava de Sobreposição e Imutabilidade (PLAN-003)
  // -----------------------------------------------------------------
  console.log("\n4. Gestão de Preços (Status de Vigência, Sobreposição e Encerramento):");

  const pricesRes = await request("/meal-prices", {
    headers: { Authorization: `Bearer ${rhToken}` },
  });
  assert(pricesRes.status === 200 && Array.isArray(pricesRes.data?.prices), "Listagem de preços 200 OK");
  const prices = pricesRes.data?.prices || [];
  const allHaveStatus = prices.every((p) => ["VIGENTE", "FUTURA", "ENCERRADA"].includes(p.status));
  assert(allHaveStatus, "Todos os preços cadastrados possuem status computado ('VIGENTE', 'FUTURA' ou 'ENCERRADA')");

  // Criar preço futuro específico para o colaborador de teste (evita sobreposição com global aberto)
  const futurePriceRes = await request("/meal-prices", {
    method: "POST",
    headers: { Authorization: `Bearer ${rhToken}` },
    body: JSON.stringify({
      employeeId: testEmpId,
      value: 33.5,
      validFrom: "2095-01-01",
      validTo: "2095-12-31",
    }),
  });
  assert(
    futurePriceRes.status === 201 && futurePriceRes.data?.price?.status === "FUTURA",
    "Criação de preço futuro calcula status 'FUTURA'"
  );
  const testPriceId = futurePriceRes.data?.price?.id;

  // Testar sobreposição no mesmo escopo (mesmo funcionário no mesmo intervalo) -> 422
  const overlapPriceRes = await request("/meal-prices", {
    method: "POST",
    headers: { Authorization: `Bearer ${rhToken}` },
    body: JSON.stringify({
      employeeId: testEmpId,
      value: 40.0,
      validFrom: "2095-06-01",
      validTo: "2095-08-01",
    }),
  });
  assert(overlapPriceRes.status === 422, "Tentativa de criar preço sobreposto no mesmo escopo é rejeitada com 422");

  // Encerramento de preço via POST /:id/close
  const closePriceRes = await request(`/meal-prices/${testPriceId}/close`, {
    method: "POST",
    headers: { Authorization: `Bearer ${rhToken}` },
    body: JSON.stringify({ endDate: "2095-06-30" }),
  });
  assert(
    closePriceRes.status === 200 && closePriceRes.data?.price?.validTo?.startsWith("2095-06-30"),
    "Encerramento de preço define validTo com sucesso"
  );

  // Limpar preço e funcionário de teste
  if (testPriceId) {
    try {
      execSync(`docker exec -i sistema-rh-pg-test psql -U postgres -d sistema_rh -c "DELETE FROM \\"MealPrice\\" WHERE id = '${testPriceId}';"`, { stdio: "ignore" });
    } catch (e) {}
  }
  await request(`/employees/${testEmpId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${rhToken}` },
  });
  // O DELETE da API só inativa; remove a linha para não poluir a base.
  try {
    execSync(`docker exec -i sistema-rh-pg-test psql -U postgres -d sistema_rh -c "DELETE FROM \\"Employee\\" WHERE id = '${testEmpId}';"`, { stdio: "ignore" });
  } catch (e) {}
  const leftover = await request(`/employees?search=Funcionario Teste Docker`, {
    headers: { Authorization: `Bearer ${rhToken}` },
  });
  const stillThere = (leftover.data?.employees ?? []).some((e) => e.id === testEmpId);
  assert(!stillThere, "Limpeza: funcionário de teste deste run removido");

  // -----------------------------------------------------------------
  // 5. Períodos e Relatórios (JSON, Excel e PDF)
  // -----------------------------------------------------------------
  console.log("\n5. Períodos de Fechamento e Formatos de Relatório (JSON, XLSX, PDF):");

  const periodsRes = await request("/billing-periods", {
    headers: { Authorization: `Bearer ${rhToken}` },
  });
  assert(periodsRes.status === 200 && Array.isArray(periodsRes.data?.periods), "Listagem de períodos de fechamento 200 OK");

  const samplePeriod = periodsRes.data?.periods?.[0];
  if (samplePeriod) {
    // Relatório JSON
    const reportJson = await request(`/billing-periods/${samplePeriod.id}/report`, {
      headers: { Authorization: `Bearer ${rhToken}` },
    });
    const rep = reportJson.data?.report || reportJson.data;
    const hasTotals = rep && typeof rep.totalQuantity === "number" && typeof rep.totalAmount === "number";
    assert(
      reportJson.status === 200 && hasTotals,
      `Relatório em formato JSON traz consolidação financeira (Qtd: ${rep?.totalQuantity}, Total: R$ ${rep?.totalAmount})`
    );

    // Relatório XLSX
    const reportXlsx = await request(`/billing-periods/${samplePeriod.id}/report?format=xlsx`, {
      headers: { Authorization: `Bearer ${rhToken}` },
    });
    assert(
      reportXlsx.status === 200 && reportXlsx.headers.get("content-type")?.includes("spreadsheetml"),
      "Relatório em formato XLSX exporta planilha Excel (Content-Type correto)"
    );

    // Relatório PDF
    const reportPdf = await request(`/billing-periods/${samplePeriod.id}/report?format=pdf`, {
      headers: { Authorization: `Bearer ${rhToken}` },
    });
    const isPdfHeader = Buffer.from(reportPdf.data).subarray(0, 4).toString() === "%PDF";
    assert(
      reportPdf.status === 200 && reportPdf.headers.get("content-type")?.includes("application/pdf") && isPdfHeader,
      "Relatório em formato PDF exporta documento válido (cabeçalho %PDF)"
    );
  } else {
    console.log("  ⚠️ Nenhum período encontrado para testar relatórios.");
  }

  // -----------------------------------------------------------------
  // 6. Gerador Anual de Períodos
  // -----------------------------------------------------------------
  console.log("\n6. Gerador Anual de Períodos (Bulk Year):");

  // Testar criação atômica dos 12 períodos para o ano 2098
  const bulkYearRes = await request("/billing-periods/bulk-year", {
    method: "POST",
    headers: { Authorization: `Bearer ${rhToken}` },
    body: JSON.stringify({ year: 2098, cutDay: 6, labelPrefix: "GTF Teste Docker" }),
  });
  assert(bulkYearRes.status === 201 && bulkYearRes.data?.periods?.length === 12, "Gerador anual cria os 12 períodos mensais de forma atômica");

  // Tentativa de recriar no mesmo ano -> conflito 409
  const bulkConflictRes = await request("/billing-periods/bulk-year", {
    method: "POST",
    headers: { Authorization: `Bearer ${rhToken}` },
    body: JSON.stringify({ year: 2098, cutDay: 6, labelPrefix: "GTF Teste Docker" }),
  });
  assert(bulkConflictRes.status === 409 && Array.isArray(bulkConflictRes.data?.conflicts), "Criação duplicada detecta sobreposição e rejeita com 409 atômico");

  // Limpeza dos períodos de 2098 criados para o teste
  try {
    execSync(`docker exec -i sistema-rh-pg-test psql -U postgres -d sistema_rh -c "DELETE FROM \\"BillingPeriod\\" WHERE label LIKE 'GTF Teste Docker%';"` , { stdio: "ignore" });
  } catch (e) {}

  // -----------------------------------------------------------------
  // Resumo Final
  // -----------------------------------------------------------------
  console.log("\n-------------------------------------------------------");
  console.log(`TOTAL DE TESTES EXECUTADOS: ${passed + failed}`);
  console.log(`PASSARAM: \x1b[32m${passed}\x1b[0m`);
  console.log(`FALHARAM:  \x1b[${failed > 0 ? "31" : "32"}m${failed}\x1b[0m`);
  console.log("-------------------------------------------------------\n");

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Erro fatal na execução dos testes:", err);
  process.exit(1);
});
