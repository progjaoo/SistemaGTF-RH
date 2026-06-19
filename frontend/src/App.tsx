import { FormEvent, Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Info,
  LogOut,
  Minus,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Soup,
  Undo2,
  Users,
  WalletCards,
  X
} from "lucide-react";
import { api } from "./api";
import logoGtf from "./images/logogtf.png";
import type {
  ApiWarning,
  BillingPeriod,
  DashboardSummary,
  Employee,
  EmployeeStatus,
  MealPrice,
  Role,
  ScheduleType,
  Session,
  User
} from "./types";

type Tab = "dashboard" | "records" | "employees" | "prices" | "periods" | "users";

const DashboardView = lazy(() => import("./components/DashboardView"));
const sessionKey = "sistema-rh-session";
const sidebarCollapsedKey = "sistema-rh-sidebar-collapsed";

const scheduleLabels: Record<ScheduleType, string> = {
  MON_FRI: "Seg-Sex",
  MON_SUN: "Seg-Dom",
  CUSTOM: "Personalizada"
};

const statusLabels: Record<EmployeeStatus, string> = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo"
};

const formatCurrency = (value: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value ?? 0);

const shortDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date(`${value}T00:00:00`));

const fullDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${value}T00:00:00`));

const longDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(`${value}T00:00:00`));

const weekday = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(new Date(`${value}T00:00:00`));

const normalizeSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

function dateRange(startDate: string, endDate: string) {
  const days: string[] = [];
  const cursor = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);

  while (cursor <= end) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return days;
}

function useDebouncedValue<T>(value: T, delay = 250) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timeout);
  }, [delay, value]);

  return debouncedValue;
}

type MealExportRow = {
  employeeName: string;
  department: string;
  date: string;
  quantity: number;
  unitPrice: number;
  employeeTotalQuantity: number;
  employeeTotalAmount: number;
};

type MealExportEmployeeSummary = {
  employeeId: string;
  employeeName: string;
  department: string;
  dates: Array<{ date: string; quantity: number }>;
  totalQuantity: number;
  totalAmount: number;
};

type MealExportSummary = {
  rows: MealExportRow[];
  employees: MealExportEmployeeSummary[];
  totalQuantity: number;
  totalAmount: number;
  usedEmployeeCount: number;
  averagePerEmployee: number;
};

const departmentFallback = "Não informado";

const generatedAt = () =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date());

const sanitizeFileName = (value: string) =>
  normalizeSearch(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "relatorio";

const csvValue = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

const htmlValue = (value: string | number) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

function resolveMealPrice(prices: MealPrice[], employeeId: string, date: string) {
  const validPrices = prices
    .filter((price) => price.validFrom <= date && (!price.validTo || price.validTo >= date))
    .sort((first, second) => second.validFrom.localeCompare(first.validFrom));

  return (
    validPrices.find((price) => price.employeeId === employeeId) ??
    validPrices.find((price) => price.employeeId === null) ??
    null
  );
}

function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function mapSession() {
  const stored = localStorage.getItem(sessionKey);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as Session;
  } catch {
    localStorage.removeItem(sessionKey);
    return null;
  }
}

export default function App() {
  const [session, setSession] = useState<Session | null>(() => mapSession());
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem(sidebarCollapsedKey) === "true"
  );
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [prices, setPrices] = useState<MealPrice[]>([]);
  const [periods, setPeriods] = useState<BillingPeriod[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [warnings, setWarnings] = useState<ApiWarning[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  const selectedPeriod = useMemo(
    () => periods.find((period) => period.id === selectedPeriodId) ?? periods[0],
    [periods, selectedPeriodId]
  );

  const loadPeriodData = useCallback(async (token: string, periodId: string) => {
    if (!periodId) return;
    const [recordsResponse, dashboardResponse] = await Promise.all([
      api.mealRecords(token, periodId),
      api.dashboard(token, periodId)
    ]);

    const nextQuantities: Record<string, number> = {};
    for (const record of recordsResponse.records) {
      nextQuantities[`${record.employeeId}:${record.date}`] = record.quantity;
    }

    setQuantities(nextQuantities);
    setDashboard(dashboardResponse.summary);
  }, []);

  const loadWorkspace = useCallback(async (currentSession: Session) => {
    setLoading(true);
    setNotice("");

    try {
      const [periodResponse, employeeResponse, priceResponse, userResponse] = await Promise.all([
        api.periods(currentSession.token),
        api.employees(currentSession.token),
        api.mealPrices(currentSession.token),
        currentSession.user.role === "RH" ? api.users(currentSession.token) : Promise.resolve({ users: [] })
      ]);

      setPeriods(periodResponse.periods);
      setEmployees(employeeResponse.employees);
      setPrices(priceResponse.prices);
      setUsers(userResponse.users);

      const nextPeriodId =
        selectedPeriodId && periodResponse.periods.some((period) => period.id === selectedPeriodId)
          ? selectedPeriodId
          : periodResponse.periods.find((period) => period.status === "OPEN")?.id ?? periodResponse.periods[0]?.id ?? "";

      setSelectedPeriodId(nextPeriodId);
      await loadPeriodData(currentSession.token, nextPeriodId);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }, [loadPeriodData, selectedPeriodId]);

  useEffect(() => {
    if (session) void loadWorkspace(session);
  }, [session]);

  const refreshSelectedPeriod = useCallback(async () => {
    if (!session || !selectedPeriodId) return;
    await loadPeriodData(session.token, selectedPeriodId);
  }, [loadPeriodData, selectedPeriodId, session]);

  const handleLogin = async (email: string, password: string) => {
    const nextSession = await api.login(email, password);
    localStorage.setItem(sessionKey, JSON.stringify(nextSession));
    setSession(nextSession);
  };

  const handleLogout = () => {
    localStorage.removeItem(sessionKey);
    setSession(null);
    setDashboard(null);
    setQuantities({});
  };

  const toggleSidebar = () => {
    setSidebarCollapsed((current) => {
      const next = !current;
      localStorage.setItem(sidebarCollapsedKey, String(next));
      return next;
    });
  };

  if (!session) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const isRh = session.user.role === "RH";
  const tabs = ([
    { id: "dashboard", label: "Dashboard", icon: <WalletCards size={18} /> },
    { id: "records", label: "Lançamentos", icon: <Soup size={18} /> },
    { id: "employees", label: "Funcionários", icon: <Users size={18} /> },
    { id: "prices", label: "Preços", icon: <WalletCards size={18} />, rhOnly: true },
    { id: "periods", label: "Períodos", icon: <CalendarCheck size={18} />, rhOnly: true },
    { id: "users", label: "Usuários", icon: <ShieldCheck size={18} />, rhOnly: true }
  ] satisfies Array<{ id: Tab; label: string; icon: JSX.Element; rhOnly?: boolean }>).filter((tab) => !tab.rhOnly || isRh);

  return (
    <Shell $collapsed={sidebarCollapsed}>
      <Sidebar $collapsed={sidebarCollapsed}>
        {!sidebarCollapsed && (
          <Brand>
            <BrandLogo src={logoGtf} alt="Grupo GTF" />
            <BrandText>
              <strong>Sistema RH</strong>
              <span>Controle de almoço</span>
            </BrandText>
          </Brand>
        )}

        <Nav aria-label="Módulos">
          {tabs.map((tab) => (
            <NavButton
              key={tab.id}
              type="button"
              title={sidebarCollapsed ? tab.label : undefined}
              $active={activeTab === tab.id}
              $collapsed={sidebarCollapsed}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              <span aria-hidden={sidebarCollapsed}>{tab.label}</span>
            </NavButton>
          ))}
        </Nav>

        <UserBox $collapsed={sidebarCollapsed}>
          <UserInfo $collapsed={sidebarCollapsed}>
            <strong>{session.user.name}</strong>
            <span>{session.user.role === "RH" ? "RH" : "Gestora"}</span>
          </UserInfo>
          <SidebarFooterActions $collapsed={sidebarCollapsed}>
            <SidebarToggle
              type="button"
              title={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
              aria-label={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
              onClick={toggleSidebar}
            >
              {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </SidebarToggle>
            <IconButton type="button" title="Sair" onClick={handleLogout}>
              <LogOut size={18} />
            </IconButton>
          </SidebarFooterActions>
        </UserBox>
      </Sidebar>

      <Main>
        <Topbar>
          <div>
            <Eyebrow>{selectedPeriod ? `${fullDate(selectedPeriod.startDate)} a ${fullDate(selectedPeriod.endDate)}` : "Sem período"}</Eyebrow>
            <h1>{selectedPeriod?.label ?? "Sistema RH - Grupo GTF"}</h1>
          </div>
          <Toolbar>
            <select value={selectedPeriodId} onChange={(event) => setSelectedPeriodId(event.target.value)}>
              {periods.map((period) => (
                <option key={period.id} value={period.id}>
                  {period.label}
                </option>
              ))}
            </select>
            <Button type="button" onClick={() => session && loadWorkspace(session)}>
              <Search size={17} />
              Atualizar
            </Button>
          </Toolbar>
        </Topbar>

        {notice && (
          <Alert>
            <span>{notice}</span>
            <IconButton type="button" title="Fechar aviso" onClick={() => setNotice("")}>
              <X size={16} />
            </IconButton>
          </Alert>
        )}

        {loading && <Loading>Carregando dados...</Loading>}

        {activeTab === "dashboard" && (
          <Suspense fallback={<Loading>Carregando dashboard...</Loading>}>
            <DashboardView dashboard={dashboard} />
          </Suspense>
        )}
        {activeTab === "records" && selectedPeriod && (
          <MealGrid
            employees={employees}
            prices={prices}
            period={selectedPeriod}
            quantities={quantities}
            warnings={warnings}
            onChangeQuantity={(key, value) => setQuantities((current) => ({ ...current, [key]: value }))}
            onSave={async () => {
              const dates = dateRange(selectedPeriod.startDate, selectedPeriod.endDate);
              const entries = employees
                .filter((employee) => employee.status === "ACTIVE")
                .flatMap((employee) =>
                  dates.map((date) => ({
                    employeeId: employee.id,
                    date,
                    quantity: quantities[`${employee.id}:${date}`] ?? 0
                  }))
                );
              const result = await api.saveMealRecords(session.token, selectedPeriod.id, entries);
              setWarnings(result.warnings);
              setNotice(result.warnings.length ? "Lançamentos salvos com alertas de jornada." : "Lançamentos salvos.");
              await refreshSelectedPeriod();
            }}
          />
        )}
        {activeTab === "employees" && (
          <EmployeesView
            employees={employees}
            canEdit={isRh}
            onSave={async (payload, id) => {
              await api.saveEmployee(session.token, payload, id);
              await loadWorkspace(session);
              setNotice("Funcionário salvo.");
            }}
            onInactivate={async (id) => {
              await api.inactivateEmployee(session.token, id);
              await loadWorkspace(session);
              setNotice("Funcionário inativado.");
            }}
          />
        )}
        {activeTab === "prices" && isRh && (
          <PricesView
            prices={prices}
            employees={employees}
            onSave={async (payload) => {
              await api.createMealPrice(session.token, payload);
              await loadWorkspace(session);
              setNotice("Preço cadastrado.");
            }}
          />
        )}
        {activeTab === "periods" && isRh && (
          <PeriodsView
            periods={periods}
            onSave={async (payload) => {
              await api.createPeriod(session.token, payload);
              await loadWorkspace(session);
              setNotice("Período criado.");
            }}
            onClose={async (period) => {
              await api.closePeriod(session.token, period.id);
              await loadWorkspace(session);
              setNotice("Período fechado.");
            }}
            onReopen={async (period) => {
              const confirmed = window.confirm("Tem certeza que deseja reabrir este período? Os lançamentos voltarão a ficar editáveis.");
              if (!confirmed) return;
              await api.reopenPeriod(session.token, period.id);
              await loadWorkspace(session);
              setNotice("Período reaberto. Os lançamentos voltaram a ficar editáveis.");
            }}
            onExport={(period) => api.downloadReport(session.token, period)}
          />
        )}
        {activeTab === "users" && isRh && (
          <UsersView
            users={users}
            onSave={async (payload, id) => {
              await api.saveUser(session.token, payload, id);
              await loadWorkspace(session);
              setNotice("Usuário salvo.");
            }}
          />
        )}
      </Main>
    </Shell>
  );
}

function LoginScreen({ onLogin }: { onLogin: (email: string, password: string) => Promise<void> }) {
  const [email, setEmail] = useState("rh@gtf.com.br");
  const [password, setPassword] = useState("123456");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await onLogin(email, password);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Não foi possível entrar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <LoginLayout>
      <LoginPanel>
        <Brand>
          <BrandMark>GTF</BrandMark>
          <div>
            <strong>Sistema RH</strong>
            <span>Controle de almoço</span>
          </div>
        </Brand>
        <LoginTitle>Entrar</LoginTitle>
        <form onSubmit={submit}>
          <Field>
            <label htmlFor="email">E-mail</label>
            <input id="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </Field>
          <Field>
            <label htmlFor="password">Senha</label>
            <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </Field>
          {error && <InlineError>{error}</InlineError>}
          <Button type="submit" disabled={submitting}>
            <ShieldCheck size={17} />
            {submitting ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </LoginPanel>
    </LoginLayout>
  );
}

function MealGrid({
  employees,
  prices,
  period,
  quantities,
  warnings,
  onChangeQuantity,
  onSave
}: {
  employees: Employee[];
  prices: MealPrice[];
  period: BillingPeriod;
  quantities: Record<string, number>;
  warnings: ApiWarning[];
  onChangeQuantity: (key: string, value: number) => void;
  onSave: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(period.startDate);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const debouncedSearch = useDebouncedValue(employeeSearch);
  const dates = useMemo(() => dateRange(period.startDate, period.endDate), [period.startDate, period.endDate]);
  const activeEmployees = useMemo(() => employees.filter((employee) => employee.status === "ACTIVE"), [employees]);

  useEffect(() => {
    setSelectedDate(period.startDate);
  }, [period.id, period.startDate]);

  const selectedDateIndex = Math.max(0, dates.indexOf(selectedDate));
  const consumptionFrequency = useMemo(() => {
    const frequency = new Map<string, number>();
    for (const employee of activeEmployees) {
      frequency.set(employee.id, dates.reduce((sum, date) => sum + (quantities[`${employee.id}:${date}`] ?? 0), 0));
    }
    return frequency;
  }, [activeEmployees, dates, quantities]);
  const visibleEmployees = useMemo(() => {
    const query = normalizeSearch(debouncedSearch);
    return activeEmployees
      .filter((employee) => !query || normalizeSearch(employee.name).includes(query))
      .sort((first, second) => {
        const frequencyDelta = (consumptionFrequency.get(second.id) ?? 0) - (consumptionFrequency.get(first.id) ?? 0);
        if (frequencyDelta !== 0) return frequencyDelta;
        return first.name.localeCompare(second.name, "pt-BR", { sensitivity: "base" });
      });
  }, [activeEmployees, consumptionFrequency, debouncedSearch]);
  const dailyTotal = useMemo(
    () => activeEmployees.reduce((sum, employee) => sum + (quantities[`${employee.id}:${selectedDate}`] ?? 0), 0),
    [activeEmployees, quantities, selectedDate]
  );
  const warningsForDate = useMemo(
    () => warnings.filter((warning) => warning.date === selectedDate),
    [selectedDate, warnings]
  );
  const warningByEmployee = useMemo(() => {
    const map = new Map<string, ApiWarning>();
    for (const warning of warningsForDate) {
      map.set(warning.employeeId, warning);
    }
    return map;
  }, [warningsForDate]);
  const exportSummary = useMemo<MealExportSummary>(() => {
    const employeeSummaries = visibleEmployees.map((employee) => {
      const datesWithLunch: Array<{ date: string; quantity: number }> = [];
      let totalQuantity = 0;
      let totalAmount = 0;

      for (const date of dates) {
        const quantity = quantities[`${employee.id}:${date}`] ?? 0;
        if (quantity <= 0) continue;
        const unitPrice = Number(resolveMealPrice(prices, employee.id, date)?.value ?? 0);
        datesWithLunch.push({ date, quantity });
        totalQuantity += quantity;
        totalAmount += quantity * unitPrice;
      }

      return {
        employeeId: employee.id,
        employeeName: employee.name,
        department: departmentFallback,
        dates: datesWithLunch,
        totalQuantity,
        totalAmount
      };
    });

    const rows = employeeSummaries.flatMap((employee) =>
      employee.dates.map((entry) => {
        const unitPrice = Number(resolveMealPrice(prices, employee.employeeId, entry.date)?.value ?? 0);
        return {
          employeeName: employee.employeeName,
          department: employee.department,
          date: entry.date,
          quantity: entry.quantity,
          unitPrice,
          employeeTotalQuantity: employee.totalQuantity,
          employeeTotalAmount: employee.totalAmount
        };
      })
    );
    const totalQuantity = employeeSummaries.reduce((sum, employee) => sum + employee.totalQuantity, 0);
    const totalAmount = employeeSummaries.reduce((sum, employee) => sum + employee.totalAmount, 0);
    const usedEmployeeCount = employeeSummaries.filter((employee) => employee.totalQuantity > 0).length;

    return {
      rows,
      employees: employeeSummaries,
      totalQuantity,
      totalAmount,
      usedEmployeeCount,
      averagePerEmployee: usedEmployeeCount > 0 ? totalQuantity / usedEmployeeCount : 0
    };
  }, [dates, prices, quantities, visibleEmployees]);

  async function save() {
    setSaving(true);
    try {
      await onSave();
    } finally {
      setSaving(false);
    }
  }

  const readOnly = period.status === "CLOSED";
  const moveDate = (direction: -1 | 1) => {
    const nextDate = dates[selectedDateIndex + direction];
    if (nextDate) setSelectedDate(nextDate);
  };
  const changeDailyQuantity = (employee: Employee, nextValue: number) => {
    if (readOnly) return;
    const key = `${employee.id}:${selectedDate}`;
    onChangeQuantity(key, Math.max(0, Math.min(10, nextValue)));
  };
  const setVisibleQuantity = (quantity: number) => {
    if (readOnly || visibleEmployees.length === 0) return;
    for (const employee of visibleEmployees) {
      onChangeQuantity(`${employee.id}:${selectedDate}`, quantity);
    }
  };
  const exportSpreadsheet = () => {
    const header = [
      "Nome do funcionário",
      "Setor/Departamento",
      "Data do lançamento",
      "Quantidade",
      "Valor do almoço",
      "Total de almoços no período por pessoa",
      "Valor total do funcionário"
    ];
    const lines = [
      header.map(csvValue).join(";"),
      ...exportSummary.rows.map((row) =>
        [
          row.employeeName,
          row.department,
          fullDate(row.date),
          row.quantity,
          formatCurrency(row.unitPrice),
          row.employeeTotalQuantity,
          formatCurrency(row.employeeTotalAmount)
        ]
          .map(csvValue)
          .join(";")
      ),
      "",
      ["Totais gerais", "", "", exportSummary.totalQuantity, formatCurrency(exportSummary.totalAmount), "", ""].map(csvValue).join(";"),
      ["Funcionários que utilizaram", exportSummary.usedEmployeeCount, "", "", "", "", ""].map(csvValue).join(";"),
      ["Média de almoços por funcionário", exportSummary.averagePerEmployee.toFixed(2).replace(".", ","), "", "", "", "", ""].map(csvValue).join(";")
    ];

    downloadTextFile(
      `almocos-${sanitizeFileName(period.label)}-${period.startDate}-${period.endDate}.csv`,
      `\ufeff${lines.join("\n")}`,
      "text/csv;charset=utf-8"
    );
  };
  const exportConferencePdf = () => {
    const reportWindow = window.open("", "_blank");
    if (!reportWindow) {
      window.alert("Não foi possível abrir o relatório. Verifique o bloqueador de pop-ups do navegador.");
      return;
    }

    const topEmployees = exportSummary.employees.filter((employee) => employee.totalQuantity > 0).slice(0, 10);
    const maxQuantity = Math.max(...topEmployees.map((employee) => employee.totalQuantity), 1);
    const employeeRows = exportSummary.employees
      .map((employee) => {
        const datesLabel = employee.dates.length
          ? employee.dates.map((entry) => `${shortDate(entry.date)}${entry.quantity > 1 ? ` (${entry.quantity})` : ""}`).join(", ")
          : "-";

        return `<tr>
          <td>${htmlValue(employee.employeeName)}</td>
          <td>${htmlValue(employee.department)}</td>
          <td>${htmlValue(datesLabel)}</td>
          <td class="number">${employee.totalQuantity}</td>
          <td class="number">${htmlValue(formatCurrency(employee.totalAmount))}</td>
        </tr>`;
      })
      .join("");
    const chartRows = topEmployees
      .map((employee) => {
        const width = Math.max(6, Math.round((employee.totalQuantity / maxQuantity) * 100));
        return `<div class="bar-row">
          <span>${htmlValue(employee.employeeName)}</span>
          <div class="bar-track"><div class="bar" style="width:${width}%"></div></div>
          <strong>${employee.totalQuantity}</strong>
        </div>`;
      })
      .join("");

    reportWindow.document.write(`<!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>Relatório de Almoços - ${htmlValue(period.label)}</title>
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; padding: 28px; color: #20262c; font-family: Arial, sans-serif; background: #fff; }
            header { display: flex; justify-content: space-between; gap: 18px; align-items: flex-start; border-bottom: 3px solid #178f5b; padding-bottom: 16px; margin-bottom: 18px; }
            h1 { margin: 4px 0; font-size: 28px; letter-spacing: 0; }
            h2 { margin: 26px 0 12px; font-size: 18px; }
            .muted { color: #667085; font-size: 13px; }
            .company { color: #178f5b; font-weight: 800; text-transform: uppercase; }
            .summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin: 18px 0; }
            .metric { border: 1px solid #dde3e8; border-radius: 8px; padding: 12px; background: #f7faf8; break-inside: avoid; }
            .metric span { display: block; color: #667085; font-size: 12px; margin-bottom: 6px; }
            .metric strong { font-size: 20px; }
            table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            th, td { border-bottom: 1px solid #dde3e8; padding: 9px 8px; text-align: left; vertical-align: top; font-size: 12px; }
            th { background: #f1f5f3; font-weight: 800; }
            .number { text-align: right; white-space: nowrap; }
            .chart { display: grid; gap: 8px; margin-bottom: 18px; }
            .bar-row { display: grid; grid-template-columns: 180px 1fr 42px; gap: 10px; align-items: center; font-size: 12px; break-inside: avoid; }
            .bar-track { height: 14px; border-radius: 999px; background: #e7ece9; overflow: hidden; }
            .bar { height: 100%; background: #178f5b; }
            @media print {
              body { padding: 18mm; }
              button { display: none; }
              .summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            }
          </style>
        </head>
        <body>
          <header>
            <div>
              <div class="company">Grupo GTF</div>
              <h1>Relatório de Almoços</h1>
              <div class="muted">Período: ${htmlValue(fullDate(period.startDate))} a ${htmlValue(fullDate(period.endDate))}</div>
            </div>
            <div class="muted">Gerado em ${htmlValue(generatedAt())}</div>
          </header>

          <section class="summary" aria-label="Resumo executivo">
            <div class="metric"><span>Total de almoços</span><strong>${exportSummary.totalQuantity}</strong></div>
            <div class="metric"><span>Valor total gasto</span><strong>${htmlValue(formatCurrency(exportSummary.totalAmount))}</strong></div>
            <div class="metric"><span>Funcionários atendidos</span><strong>${exportSummary.usedEmployeeCount}</strong></div>
            <div class="metric"><span>Média por funcionário</span><strong>${exportSummary.averagePerEmployee.toFixed(1).replace(".", ",")}</strong></div>
          </section>

          ${chartRows ? `<h2>Maiores consumos no período</h2><section class="chart">${chartRows}</section>` : ""}

          <h2>Detalhamento por funcionário</h2>
          <table>
            <thead>
              <tr>
                <th>Funcionário</th>
                <th>Setor/Departamento</th>
                <th>Dias com almoço</th>
                <th class="number">Total</th>
                <th class="number">Valor total</th>
              </tr>
            </thead>
            <tbody>${employeeRows}</tbody>
          </table>
        </body>
      </html>`);
    reportWindow.document.close();
    reportWindow.focus();
    window.setTimeout(() => reportWindow.print(), 300);
  };

  return (
    <RecordsLayout>
      <RecordsHero>
        <RecordsTitle>
          <RecordsMark>
            <Soup size={26} />
          </RecordsMark>
          <div>
            <h2>Registro de Refeições</h2>
            <p>{readOnly ? "Período fechado para consulta" : "Registre as refeições do dia"}</p>
          </div>
        </RecordsTitle>
        <SaveButton type="button" onClick={save} disabled={saving || readOnly}>
          <Save size={20} />
          {saving ? "Salvando..." : "Salvar"}
        </SaveButton>
      </RecordsHero>

      <DailyControls>
        <DateCard>
          <DateNavButton type="button" onClick={() => moveDate(-1)} disabled={selectedDateIndex === 0} aria-label="Dia anterior">
            <ChevronLeft size={22} />
          </DateNavButton>
          <DateSummary>
            <strong>{longDate(selectedDate)}</strong>
            <span>{weekday(selectedDate)}</span>
          </DateSummary>
          <DateNavButton type="button" onClick={() => moveDate(1)} disabled={selectedDateIndex === dates.length - 1} aria-label="Próximo dia">
            <ChevronRight size={22} />
          </DateNavButton>
        </DateCard>

        <InfoCard>
          <Info size={18} />
          <span>Informe a quantidade de refeições para cada colaborador neste dia.</span>
        </InfoCard>

        <DailyTotalCard>
          <span>Total do dia</span>
          <strong>{dailyTotal}</strong>
        </DailyTotalCard>
      </DailyControls>

      <RecordsTools>
        <SearchField>
          <label htmlFor="employee-search">Buscar funcionário</label>
          <SearchInputWrap>
            <Search size={18} />
            <input
              id="employee-search"
              value={employeeSearch}
              onChange={(event) => setEmployeeSearch(event.target.value)}
              placeholder="Filtrar por nome"
            />
          </SearchInputWrap>
        </SearchField>

        <BulkActions>
          <SortHint>{visibleEmployees.length} exibidos · Mais consumo primeiro, A-Z no empate</SortHint>
          <Button type="button" onClick={() => setVisibleQuantity(1)} disabled={readOnly || visibleEmployees.length === 0}>
            <CheckCircle2 size={17} />
            Marcar para todos os {visibleEmployees.length} exibidos
          </Button>
          <Button type="button" $variant="ghost" onClick={() => setVisibleQuantity(0)} disabled={readOnly || visibleEmployees.length === 0}>
            <X size={17} />
            Desmarcar exibidos
          </Button>
          <Button type="button" $variant="ghost" onClick={exportSpreadsheet} disabled={visibleEmployees.length === 0}>
            <Download size={17} />
            Exportar planilha
          </Button>
          <Button type="button" $variant="ghost" onClick={exportConferencePdf} disabled={visibleEmployees.length === 0}>
            <FileText size={17} />
            Gerar PDF
          </Button>
        </BulkActions>
      </RecordsTools>

      <EmployeeCards aria-label="Lançamentos por funcionário">
        {visibleEmployees.length === 0 && (
          <EmptyState>Nenhum funcionário encontrado para o filtro informado.</EmptyState>
        )}
        {visibleEmployees.map((employee) => {
          const quantity = quantities[`${employee.id}:${selectedDate}`] ?? 0;
          const warning = warningByEmployee.get(employee.id);

          return (
            <EmployeeMealCard key={employee.id} $warn={Boolean(warning)}>
              <EmployeeIdentity>
                <EmployeeInitials aria-hidden="true">{initials(employee.name)}</EmployeeInitials>
                <div>
                  <strong>{employee.name}</strong>
                  <span><CalendarCheck size={15} /> {scheduleLabels[employee.scheduleType]}</span>
                </div>
              </EmployeeIdentity>

              <QuantityControl aria-label={`Quantidade de refeições de ${employee.name} em ${fullDate(selectedDate)}`}>
                <QuantityButton
                  type="button"
                  onClick={() => changeDailyQuantity(employee, quantity - 1)}
                  disabled={readOnly || quantity <= 0}
                  aria-label={`Diminuir refeições de ${employee.name}`}
                >
                  <Minus size={20} />
                </QuantityButton>
                <QuantityValue>
                  <strong>{quantity}</strong>
                  <span>{quantity === 1 ? "refeição" : "refeições"}</span>
                </QuantityValue>
                <QuantityButton
                  type="button"
                  onClick={() => changeDailyQuantity(employee, quantity + 1)}
                  disabled={readOnly || quantity >= 10}
                  aria-label={`Aumentar refeições de ${employee.name}`}
                >
                  <Plus size={20} />
                </QuantityButton>
              </QuantityControl>

              {warning && (
                <RowWarning title={warning.message}>
                  <AlertTriangle size={22} />
                </RowWarning>
              )}
            </EmployeeMealCard>
          );
        })}
      </EmployeeCards>

      <SaveStatus>
        {warningsForDate.length > 0 ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
        <span>
          {warningsForDate.length > 0
            ? "Há quantidades fora do tipo de jornada programada para a data."
            : `Os registros são salvos apenas para ${fullDate(selectedDate)}.`}
        </span>
      </SaveStatus>
    </RecordsLayout>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function EmployeesView({
  employees,
  canEdit,
  onSave,
  onInactivate
}: {
  employees: Employee[];
  canEdit: boolean;
  onSave: (payload: Omit<Employee, "id">, id?: string) => Promise<void>;
  onInactivate: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState<Omit<Employee, "id">>({
    name: "",
    status: "ACTIVE",
    scheduleType: "MON_FRI",
    admissionDate: "",
    terminationDate: ""
  });

  function startEdit(employee: Employee) {
    setEditing(employee);
    setForm({
      name: employee.name,
      status: employee.status,
      scheduleType: employee.scheduleType,
      admissionDate: employee.admissionDate ?? "",
      terminationDate: employee.terminationDate ?? ""
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSave({ ...form, admissionDate: form.admissionDate || null, terminationDate: form.terminationDate || null }, editing?.id);
    setEditing(null);
    setForm({ name: "", status: "ACTIVE", scheduleType: "MON_FRI", admissionDate: "", terminationDate: "" });
  }

  return (
    <TwoColumn>
      {canEdit && (
        <Panel>
          <PanelHeader>
            <h2>{editing ? "Editar funcionário" : "Novo funcionário"}</h2>
          </PanelHeader>
          <FormGrid onSubmit={submit}>
            <Field>
              <label>Nome</label>
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            </Field>
            <Field>
              <label>Status</label>
              <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as EmployeeStatus })}>
                <option value="ACTIVE">Ativo</option>
                <option value="INACTIVE">Inativo</option>
              </select>
            </Field>
            <Field>
              <label>Jornada</label>
              <select value={form.scheduleType} onChange={(event) => setForm({ ...form, scheduleType: event.target.value as ScheduleType })}>
                <option value="MON_FRI">Seg-Sex</option>
                <option value="MON_SUN">Seg-Dom</option>
                <option value="CUSTOM">Personalizada</option>
              </select>
            </Field>
            <Field>
              <label>Admissão</label>
              <input type="date" value={form.admissionDate ?? ""} onChange={(event) => setForm({ ...form, admissionDate: event.target.value })} />
            </Field>
            <Field>
              <label>Desligamento</label>
              <input type="date" value={form.terminationDate ?? ""} onChange={(event) => setForm({ ...form, terminationDate: event.target.value })} />
            </Field>
            <Button type="submit">
              <Save size={17} />
              Salvar
            </Button>
          </FormGrid>
        </Panel>
      )}

      <Panel>
        <PanelHeader>
          <h2>Funcionários</h2>
        </PanelHeader>
        <DataTable>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Jornada</th>
              <th>Status</th>
              {canEdit && <th>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id}>
                <td>{employee.name}</td>
                <td>{scheduleLabels[employee.scheduleType]}</td>
                <td><Badge $tone={employee.status === "ACTIVE" ? "good" : "muted"}>{statusLabels[employee.status]}</Badge></td>
                {canEdit && (
                  <td>
                    <InlineActions>
                      <Button type="button" onClick={() => startEdit(employee)}>Editar</Button>
                      <Button type="button" $variant="ghost" onClick={() => onInactivate(employee.id)}>Inativar</Button>
                    </InlineActions>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </DataTable>
      </Panel>
    </TwoColumn>
  );
}

function PricesView({
  prices,
  employees,
  onSave
}: {
  prices: MealPrice[];
  employees: Employee[];
  onSave: (payload: { value: number; validFrom: string; validTo?: string | null; employeeId?: string | null }) => Promise<void>;
}) {
  const [value, setValue] = useState("8.50");
  const [validFrom, setValidFrom] = useState("2026-06-01");
  const [employeeId, setEmployeeId] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSave({ value: Number(value), validFrom, employeeId: employeeId || null });
    setEmployeeId("");
  }

  return (
    <TwoColumn>
      <Panel>
        <PanelHeader>
          <h2>Novo preço</h2>
        </PanelHeader>
        <FormGrid onSubmit={submit}>
          <Field>
            <label>Valor</label>
            <input type="number" step="0.01" min="0.01" value={value} onChange={(event) => setValue(event.target.value)} required />
          </Field>
          <Field>
            <label>Vigência inicial</label>
            <input type="date" value={validFrom} onChange={(event) => setValidFrom(event.target.value)} required />
          </Field>
          <Field>
            <label>Funcionário</label>
            <select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>
              <option value="">Preço global</option>
              {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
            </select>
          </Field>
          <Button type="submit">
            <Plus size={17} />
            Cadastrar
          </Button>
        </FormGrid>
      </Panel>

      <Panel>
        <PanelHeader>
          <h2>Histórico de preços</h2>
        </PanelHeader>
        <DataTable>
          <thead>
            <tr>
              <th>Escopo</th>
              <th>Vigência</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            {prices.map((price) => (
              <tr key={price.id}>
                <td>{price.employee?.name ?? "Global"}</td>
                <td>{fullDate(price.validFrom)}</td>
                <td>{formatCurrency(price.value)}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </Panel>
    </TwoColumn>
  );
}

function PeriodsView({
  periods,
  onSave,
  onClose,
  onReopen,
  onExport
}: {
  periods: BillingPeriod[];
  onSave: (payload: Pick<BillingPeriod, "label" | "startDate" | "endDate">) => Promise<void>;
  onClose: (period: BillingPeriod) => Promise<void>;
  onReopen: (period: BillingPeriod) => Promise<void>;
  onExport: (period: BillingPeriod) => Promise<void>;
}) {
  const [form, setForm] = useState({ label: "", startDate: "", endDate: "" });

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSave(form);
    setForm({ label: "", startDate: "", endDate: "" });
  }

  return (
    <TwoColumn>
      <Panel>
        <PanelHeader>
          <h2>Novo período</h2>
        </PanelHeader>
        <FormGrid onSubmit={submit}>
          <Field>
            <label>Rótulo</label>
            <input value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} required />
          </Field>
          <Field>
            <label>Início</label>
            <input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} required />
          </Field>
          <Field>
            <label>Fim</label>
            <input type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} required />
          </Field>
          <Button type="submit">
            <Plus size={17} />
            Criar
          </Button>
        </FormGrid>
      </Panel>
      <Panel>
        <PanelHeader>
          <h2>Períodos</h2>
        </PanelHeader>
        <DataTable>
          <thead>
            <tr>
              <th>Período</th>
              <th>Status</th>
              <th>Total</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {periods.map((period) => (
              <tr key={period.id}>
                <td>{period.label}</td>
                <td><Badge $tone={period.status === "OPEN" ? "warn" : "good"}>{period.status === "OPEN" ? "Aberto" : "Fechado"}</Badge></td>
                <td>{formatCurrency(period.totalAmount)}</td>
                <td>
                  <InlineActions>
                    <Button type="button" onClick={() => onExport(period)}>
                      <Download size={16} />
                      Excel
                    </Button>
                    <Button type="button" $variant="ghost" disabled={period.status === "CLOSED"} onClick={() => onClose(period)}>
                      Fechar
                    </Button>
                    {period.status === "CLOSED" && (
                      <Button type="button" $variant="ghost" onClick={() => onReopen(period)}>
                        <Undo2 size={16} />
                        Reabrir período
                      </Button>
                    )}
                  </InlineActions>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </Panel>
    </TwoColumn>
  );
}

function UsersView({
  users,
  onSave
}: {
  users: User[];
  onSave: (payload: { name: string; email: string; password?: string; role: Role; active: boolean }, id?: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "GESTORA" as Role, active: true });

  function startEdit(user: User) {
    setEditing(user);
    setForm({ name: user.name, email: user.email, password: "", role: user.role, active: user.active });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSave({ ...form, password: form.password || undefined }, editing?.id);
    setEditing(null);
    setForm({ name: "", email: "", password: "", role: "GESTORA", active: true });
  }

  return (
    <TwoColumn>
      <Panel>
        <PanelHeader>
          <h2>{editing ? "Editar usuário" : "Novo usuário"}</h2>
        </PanelHeader>
        <FormGrid onSubmit={submit}>
          <Field>
            <label>Nome</label>
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          </Field>
          <Field>
            <label>E-mail</label>
            <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
          </Field>
          <Field>
            <label>Senha</label>
            <input type="password" minLength={editing ? 0 : 6} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required={!editing} />
          </Field>
          <Field>
            <label>Papel</label>
            <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as Role })}>
              <option value="RH">RH</option>
              <option value="GESTORA">Gestora</option>
            </select>
          </Field>
          <CheckboxLabel>
            <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
            Ativo
          </CheckboxLabel>
          <Button type="submit">
            <Save size={17} />
            Salvar
          </Button>
        </FormGrid>
      </Panel>

      <Panel>
        <PanelHeader>
          <h2>Usuários</h2>
        </PanelHeader>
        <DataTable>
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Papel</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.role === "RH" ? "RH" : "Gestora"}</td>
                <td><Badge $tone={user.active ? "good" : "muted"}>{user.active ? "Ativo" : "Inativo"}</Badge></td>
                <td><Button type="button" onClick={() => startEdit(user)}>Editar</Button></td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </Panel>
    </TwoColumn>
  );
}

const Shell = styled.div<{ $collapsed: boolean }>`
  display: grid;
  grid-template-columns: ${({ $collapsed }) => ($collapsed ? "96px" : "280px")} minmax(0, 1fr);
  min-height: 100vh;
  transition: grid-template-columns 0.22s ease;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const Sidebar = styled.aside<{ $collapsed: boolean }>`
  position: sticky;
  top: 0;
  height: 100vh;
  display: grid;
  grid-template-rows: ${({ $collapsed }) => ($collapsed ? "1fr auto" : "auto 1fr auto")};
  gap: ${({ $collapsed }) => ($collapsed ? "20px" : "24px")};
  padding: ${({ $collapsed }) => ($collapsed ? "22px 12px" : "24px")};
  background: #20262c;
  color: #fff;
  border-right: 5px solid var(--teal);
  overflow: hidden;
  transition: padding 0.22s ease, gap 0.22s ease;

  @media (max-width: 900px) {
    position: static;
    height: auto;
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto;
    padding: 18px;
  }
`;

const Brand = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  min-width: 0;

  strong {
    display: block;
    font-size: 1rem;
  }

  span {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.86rem;
  }

  @media (max-width: 900px) {
    justify-content: flex-start;
    gap: 12px;
  }
`;

const BrandLogo = styled.img`
  display: block;
  width: 76px;
  max-width: 100%;
  height: 58px;
  object-fit: contain;
  border-radius: 0;
  transition: width 0.22s ease, height 0.22s ease;

  @media (max-width: 900px) {
    width: 76px;
    height: 58px;
  }
`;

const BrandText = styled.div`
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
`;

const BrandMark = styled.div`
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  border-radius: 8px;
  background: var(--teal);
  color: #fff;
  font-weight: 900;
  letter-spacing: 0;
`;

const Nav = styled.nav`
  display: grid;
  align-content: start;
  justify-items: stretch;
  gap: 8px;
  min-width: 0;
  padding-top: 4px;

  @media (max-width: 900px) {
    grid-column: 1 / -1;
  }
`;

const NavButton = styled.button<{ $active: boolean; $collapsed: boolean }>`
  display: flex;
  align-items: center;
  justify-content: ${({ $collapsed }) => ($collapsed ? "center" : "flex-start")};
  gap: ${({ $collapsed }) => ($collapsed ? "0" : "10px")};
  width: ${({ $collapsed }) => ($collapsed ? "56px" : "100%")};
  height: ${({ $collapsed }) => ($collapsed ? "56px" : "auto")};
  justify-self: ${({ $collapsed }) => ($collapsed ? "center" : "stretch")};
  padding: ${({ $collapsed }) => ($collapsed ? "0" : "11px 12px")};
  border: 1px solid ${({ $active }) => ($active ? "rgba(255,255,255,0.28)" : "transparent")};
  border-radius: 8px;
  color: #fff;
  background: ${({ $active }) => ($active ? "rgba(255,255,255,0.12)" : "transparent")};
  text-align: left;
  transition: background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;

  svg {
    flex: 0 0 auto;
  }

  span {
    overflow: hidden;
    max-width: ${({ $collapsed }) => ($collapsed ? "0" : "160px")};
    opacity: ${({ $collapsed }) => ($collapsed ? 0 : 1)};
    white-space: nowrap;
    transition: max-width 0.22s ease, opacity 0.16s ease;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  @media (max-width: 900px) {
    justify-content: flex-start;
    gap: 10px;

    span {
      max-width: 160px;
      opacity: 1;
    }
  }
`;

const SidebarToggle = styled.button`
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.15);
  }

  @media (max-width: 900px) {
    justify-self: end;
  }
`;

const UserBox = styled.div<{ $collapsed: boolean }>`
  display: grid;
  justify-items: ${({ $collapsed }) => ($collapsed ? "center" : "stretch")};
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.18);

  span {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.86rem;
  }

  @media (max-width: 900px) {
    justify-items: stretch;
  }
`;

const SidebarFooterActions = styled.div<{ $collapsed: boolean }>`
  display: flex;
  flex-direction: ${({ $collapsed }) => ($collapsed ? "column" : "row")};
  align-items: center;
  justify-content: ${({ $collapsed }) => ($collapsed ? "center" : "space-between")};
  gap: 8px;
  width: 100%;

  button {
    flex: 0 0 auto;
    ${({ $collapsed }) => $collapsed && "width: 56px; height: 56px;"}
  }

  @media (max-width: 900px) {
    justify-content: flex-start;
  }
`;

const UserInfo = styled.div<{ $collapsed: boolean }>`
  min-width: 0;
  overflow: hidden;
  opacity: ${({ $collapsed }) => ($collapsed ? 0 : 1)};
  max-height: ${({ $collapsed }) => ($collapsed ? "0" : "56px")};
  transition: opacity 0.18s ease, max-height 0.22s ease;

  strong {
    overflow-wrap: anywhere;
  }

  @media (max-width: 900px) {
    opacity: 1;
    max-height: 56px;
  }
`;

const Main = styled.main`
  min-width: 0;
  padding: 28px;
  transition: padding 0.2s ease;

  @media (max-width: 700px) {
    padding: 16px;
  }
`;

const Topbar = styled.header`
  display: flex;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 20px;

  h1 {
    margin: 4px 0 0;
    font-size: clamp(1.4rem, 2.4vw, 2.4rem);
    letter-spacing: 0;
  }

  @media (max-width: 820px) {
    flex-direction: column;
  }
`;

const Eyebrow = styled.div`
  color: var(--teal);
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
`;

const Toolbar = styled.div`
  display: flex;
  align-items: start;
  gap: 10px;

  select {
    min-width: 230px;
  }

  @media (max-width: 600px) {
    flex-direction: column;
    align-items: stretch;

    select {
      min-width: 0;
    }
  }
`;

const Button = styled.button<{ $variant?: "solid" | "ghost" }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 38px;
  padding: 8px 13px;
  border: 1px solid ${({ $variant }) => ($variant === "ghost" ? "var(--line)" : "var(--teal)")};
  border-radius: 8px;
  background: ${({ $variant }) => ($variant === "ghost" ? "var(--surface)" : "var(--teal)")};
  color: ${({ $variant }) => ($variant === "ghost" ? "var(--ink)" : "#fff")};
  font-weight: 750;
  transition: background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, color 0.2s ease, opacity 0.2s ease;

  &:hover:not(:disabled) {
    border-color: ${({ $variant }) => ($variant === "ghost" ? "rgba(15, 118, 110, 0.34)" : "#0b625b")};
    background: ${({ $variant }) => ($variant === "ghost" ? "var(--teal-soft)" : "#0b625b")};
    box-shadow: 0 8px 20px rgba(15, 118, 110, 0.14);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

const IconButton = styled.button`
  display: inline-grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 8px;
  background: transparent;
  color: inherit;
  transition: background-color 0.2s ease, border-color 0.2s ease, opacity 0.2s ease;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const Panel = styled.section`
  min-width: 0;
  padding: 18px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow);
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;

  h2 {
    margin: 0;
    font-size: 1.05rem;
  }

  p {
    margin: 4px 0 0;
    color: var(--muted);
    font-size: 0.9rem;
  }
`;

const TwoColumn = styled.div`
  display: grid;
  grid-template-columns: minmax(280px, 380px) minmax(0, 1fr);
  gap: 18px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const RecordsLayout = styled.section`
  display: grid;
  gap: 18px;
`;

const RecordsHero = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 4px;

  @media (max-width: 720px) {
    align-items: stretch;
    flex-direction: column;
  }
`;

const RecordsTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 13px;

  h2 {
    margin: 0;
    font-size: clamp(1.45rem, 2.2vw, 2.25rem);
    letter-spacing: 0;
  }

  p {
    margin: 3px 0 0;
    color: var(--muted);
  }
`;

const RecordsMark = styled.div`
  display: grid;
  width: 58px;
  height: 58px;
  place-items: center;
  border-radius: 8px;
  background: var(--teal);
  color: #fff;
  box-shadow: 0 14px 28px rgba(15, 118, 110, 0.22);
`;

const SaveButton = styled(Button)`
  min-height: 54px;
  padding: 12px 20px;
  box-shadow: 0 14px 28px rgba(15, 118, 110, 0.24);

  @media (max-width: 720px) {
    width: 100%;
  }
`;

const DailyControls = styled.div`
  display: grid;
  grid-template-columns: minmax(280px, 470px) minmax(260px, 1fr) minmax(140px, 180px);
  gap: 12px;

  @media (max-width: 1050px) {
    grid-template-columns: 1fr 1fr;
  }

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
`;

const DateCard = styled.div`
  display: grid;
  grid-template-columns: 52px 1fr 52px;
  align-items: center;
  min-height: 76px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow);
`;

const DateNavButton = styled.button`
  display: grid;
  height: 100%;
  min-height: 74px;
  place-items: center;
  border: 0;
  background: transparent;
  color: var(--steel);

  &:disabled {
    opacity: 0.32;
    cursor: not-allowed;
  }
`;

const DateSummary = styled.div`
  display: grid;
  justify-items: center;
  gap: 3px;
  padding: 11px 6px;
  text-align: center;

  strong {
    font-size: 1.05rem;
  }

  span {
    color: var(--muted);
    font-size: 0.88rem;
    text-transform: capitalize;
  }
`;

const InfoCard = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 76px;
  padding: 14px 16px;
  border: 1px solid rgba(15, 118, 110, 0.2);
  border-radius: 8px;
  background: var(--teal-soft);
  color: var(--teal);
  font-weight: 750;
`;

const DailyTotalCard = styled.div`
  display: grid;
  align-content: center;
  justify-items: center;
  min-height: 76px;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow);

  span {
    color: var(--muted);
    font-size: 0.82rem;
    font-weight: 750;
  }

  strong {
    font-size: 1.8rem;
    line-height: 1;
  }
`;

const RecordsTools = styled.div`
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.74);
  box-shadow: var(--shadow);

  @media (max-width: 820px) {
    align-items: stretch;
    flex-direction: column;
  }
`;

const SearchField = styled.div`
  display: grid;
  gap: 7px;
  width: min(420px, 100%);

  label {
    color: var(--muted);
    font-size: 0.82rem;
    font-weight: 750;
  }
`;

const SearchInputWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 44px;
  padding: 0 12px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  color: var(--muted);

  input {
    width: 100%;
    min-width: 0;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--ink);
  }

  &:focus-within {
    border-color: rgba(15, 118, 110, 0.55);
    box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.12);
  }
`;

const BulkActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  max-width: 620px;

  @media (max-width: 820px) {
    justify-content: stretch;

    ${Button} {
      flex: 1 1 210px;
    }
  }
`;

const SortHint = styled.span`
  flex: 1 1 100%;
  color: var(--muted);
  font-size: 0.82rem;
  font-weight: 750;
  text-align: right;

  @media (max-width: 820px) {
    text-align: left;
  }
`;

const EmployeeCards = styled.div`
  display: grid;
  gap: 10px;
`;

const EmployeeMealCard = styled.article<{ $warn: boolean }>`
  display: grid;
  grid-template-columns: minmax(240px, 1.4fr) minmax(250px, 360px) 38px;
  align-items: center;
  gap: 16px;
  min-height: 92px;
  padding: 14px 16px;
  border: 1px solid ${({ $warn }) => ($warn ? "rgba(217, 119, 6, 0.38)" : "var(--line)")};
  border-left: 5px solid ${({ $warn }) => ($warn ? "var(--amber)" : "var(--teal)")};
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow);

  @media (max-width: 840px) {
    grid-template-columns: 1fr auto;
    align-items: start;
  }

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
  }
`;

const EmployeeIdentity = styled.div`
  display: flex;
  align-items: center;
  gap: 13px;
  min-width: 0;

  strong {
    display: block;
    overflow-wrap: anywhere;
    font-size: 1.04rem;
  }

  span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 5px;
    color: var(--muted);
    font-size: 0.9rem;
  }
`;

const EmployeeInitials = styled.div`
  display: grid;
  flex: 0 0 auto;
  width: 52px;
  height: 52px;
  place-items: center;
  border: 1px solid rgba(15, 118, 110, 0.18);
  border-radius: 8px;
  background: linear-gradient(180deg, var(--teal-soft), #fff);
  color: var(--teal);
  font-weight: 900;
`;

const QuantityControl = styled.div`
  display: grid;
  grid-template-columns: 58px minmax(110px, 1fr) 58px;
  align-items: stretch;
  justify-self: stretch;
  min-height: 58px;
  border: 1px solid var(--line);
  border-radius: 8px;
  overflow: hidden;
  background: #fff;

  @media (max-width: 620px) {
    width: 100%;
  }
`;

const QuantityButton = styled.button`
  display: grid;
  place-items: center;
  border: 0;
  background: var(--teal-soft);
  color: var(--teal);

  &:hover:not(:disabled) {
    background: rgba(15, 118, 110, 0.18);
  }

  &:disabled {
    color: var(--muted);
    background: #f3f5f7;
    cursor: not-allowed;
  }
`;

const QuantityValue = styled.div`
  display: grid;
  place-items: center;
  padding: 7px 10px;

  strong {
    font-size: 1.35rem;
    line-height: 1;
  }

  span {
    margin-top: 3px;
    color: var(--muted);
    font-size: 0.78rem;
    font-weight: 750;
  }
`;

const RowWarning = styled.div`
  display: grid;
  justify-self: end;
  width: 36px;
  height: 36px;
  place-items: center;
  color: var(--amber);

  @media (max-width: 840px) {
    grid-column: 2;
    grid-row: 1;
  }

  @media (max-width: 620px) {
    justify-self: start;
    grid-column: auto;
    grid-row: auto;
  }
`;

const SaveStatus = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border: 1px solid rgba(15, 118, 110, 0.2);
  border-radius: 8px;
  background: var(--teal-soft);
  color: var(--teal);
  font-weight: 750;
`;

const GridScroller = styled.div`
  overflow: auto;
  border: 1px solid var(--line);
  border-radius: 8px;
`;

const RecordsTable = styled.table`
  width: 100%;
  min-width: 980px;
  border-collapse: collapse;
  table-layout: fixed;

  th,
  td {
    padding: 8px;
    border-bottom: 1px solid var(--line);
    text-align: center;
  }

  th:first-child,
  td:first-child {
    position: sticky;
    left: 0;
    z-index: 1;
    width: 220px;
    background: #fff;
    text-align: left;
  }

  thead th {
    background: #eef3f6;
    color: var(--steel);
    font-size: 0.82rem;
  }

  tfoot th,
  tfoot td {
    background: var(--teal-soft);
    font-weight: 800;
  }
`;

const RowHead = styled.td`
  strong,
  span {
    display: block;
  }

  span {
    color: var(--muted);
    font-size: 0.8rem;
  }
`;

const NumberInput = styled.input`
  width: 58px;
  min-height: 36px;
  border: 1px solid var(--line);
  border-radius: 8px;
  text-align: center;
`;

const TotalCell = styled.td`
  font-weight: 850;
`;

const DataTable = styled.table`
  width: 100%;
  border-collapse: collapse;

  th,
  td {
    padding: 11px 10px;
    border-bottom: 1px solid var(--line);
    text-align: left;
    vertical-align: middle;
  }

  th {
    color: var(--muted);
    font-size: 0.78rem;
    text-transform: uppercase;
  }
`;

const FormGrid = styled.form`
  display: grid;
  gap: 12px;
`;

const Field = styled.div`
  display: grid;
  gap: 6px;

  label {
    color: var(--muted);
    font-size: 0.82rem;
    font-weight: 750;
  }

  input,
  select {
    width: 100%;
    min-height: 40px;
    padding: 8px 10px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: #fff;
    color: var(--ink);
  }
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  font-weight: 700;
`;

const InlineActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const Badge = styled.span<{ $tone: "good" | "warn" | "muted" }>`
  display: inline-flex;
  padding: 4px 8px;
  border-radius: 999px;
  background: ${({ $tone }) => ($tone === "good" ? "var(--teal-soft)" : $tone === "warn" ? "#fff2d8" : "#edf0f3")};
  color: ${({ $tone }) => ($tone === "good" ? "var(--teal)" : $tone === "warn" ? "var(--amber)" : "var(--muted)")};
  font-size: 0.78rem;
  font-weight: 800;
`;

const Alert = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 14px;
  padding: 11px 12px;
  border: 1px solid rgba(15, 118, 110, 0.25);
  border-radius: 8px;
  background: var(--teal-soft);
  color: var(--teal);
  font-weight: 750;

  ${IconButton} {
    color: var(--teal);
    border-color: rgba(15, 118, 110, 0.25);
  }
`;

const WarningList = styled.div`
  display: grid;
  gap: 6px;
  margin-bottom: 12px;
  padding: 10px;
  border-radius: 8px;
  background: #fff7e8;
  color: #9a5b05;
  font-size: 0.9rem;
`;

const Loading = styled.div`
  margin-bottom: 14px;
  color: var(--muted);
`;

const EmptyState = styled.div`
  padding: 28px;
  border: 1px dashed var(--line);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.72);
  color: var(--muted);
`;

const LoginLayout = styled.main`
  display: grid;
  min-height: 100vh;
  place-items: center;
  padding: 20px;
`;

const LoginPanel = styled.section`
  width: min(420px, 100%);
  padding: 26px;
  border: 1px solid var(--line);
  border-top: 6px solid var(--teal);
  border-radius: 8px;
  background: #20262c;
  color: #fff;
  box-shadow: var(--shadow);

  form {
    display: grid;
    gap: 14px;
    margin-top: 20px;
  }

  ${Field} label {
    color: rgba(255, 255, 255, 0.78);
  }
`;

const LoginTitle = styled.h1`
  margin: 28px 0 0;
  font-size: 2.3rem;
  letter-spacing: 0;
`;

const InlineError = styled.div`
  color: #ffd1d1;
  font-weight: 750;
`;
