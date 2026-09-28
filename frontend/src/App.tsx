import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { CalendarCheck, Search, ShieldCheck, Soup, Users, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { api } from "./api";
import { Eyebrow, Main, Sidebar, Toolbar, Topbar } from "./components/layout";
import { ThemeToggle } from "./components/ThemeToggle";
import { Loading } from "./components/ui";
import { useSession } from "./hooks/useSession";
import { useSidebarCollapsed } from "./hooks/useSidebarCollapsed";
import type { NavigationTab, Tab } from "./navigation";
import EmployeesPage from "./pages/EmployeesPage";
import LoginPage from "./pages/LoginPage";
import EmployeePortalPage from "./pages/EmployeePortalPage";
import PeriodsPage from "./pages/PeriodsPage";
import PricesPage from "./pages/PricesPage";
import RecordsPage from "./pages/RecordsPage";
import UsersPage from "./pages/UsersPage";
import type { ApiWarning, BillingPeriod, DashboardSummary, Employee, MealPrice, User } from "./types";
import { dateKeyInSaoPaulo, dateRange, fullDate } from "./utils/date";

const DashboardPage = lazy(() => import("./pages/DashboardPage"));

export default function App() {
  const { session, handleLogin, handleLogout } = useSession();
  const { sidebarCollapsed, setCollapsed } = useSidebarCollapsed();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [confirmClose, setConfirmClose] = useState<BillingPeriod | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [prices, setPrices] = useState<MealPrice[]>([]);
  const [periods, setPeriods] = useState<BillingPeriod[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [warnings, setWarnings] = useState<ApiWarning[]>([]);
  const [loading, setLoading] = useState(false);

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

  const loadWorkspace = useCallback(async (currentSession: NonNullable<typeof session>, preferredPeriodId?: string) => {
    setLoading(true);

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
        preferredPeriodId && periodResponse.periods.some((period) => period.id === preferredPeriodId)
          ? preferredPeriodId
          : selectedPeriodId && periodResponse.periods.some((period) => period.id === selectedPeriodId)
          ? selectedPeriodId
          : periodResponse.periods.find((period) => period.status === "OPEN")?.id ?? periodResponse.periods[0]?.id ?? "";

      setSelectedPeriodId(nextPeriodId);
      await loadPeriodData(currentSession.token, nextPeriodId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }, [loadPeriodData, selectedPeriodId]);

  useEffect(() => {
    if (session) void loadWorkspace(session);
  }, [loadWorkspace, session]);

  const refreshSelectedPeriod = useCallback(async () => {
    if (!session || !selectedPeriodId) return;
    await loadPeriodData(session.token, selectedPeriodId);
  }, [loadPeriodData, selectedPeriodId, session]);

  const logout = () => {
    handleLogout();
    setDashboard(null);
    setQuantities({});
  };

  const isEmployeePortal = window.location.pathname.endsWith("/colaborador") || window.location.pathname.endsWith("/colaborador/");

  if (isEmployeePortal) {
    return (
      <>
        <EmployeePortalPage />
        <Toaster position="bottom-center" />
      </>
    );
  }

  if (!session) {
    return (
      <>
        <LoginPage onLogin={handleLogin} />
        <Toaster position="top-center" />
      </>
    );
  }

  const isRh = session.user.role === "RH";
  const tabs = ([
    { id: "dashboard", label: "Dashboard", icon: <WalletCards size={18} /> },
    { id: "records", label: "Lançamentos", icon: <Soup size={18} /> },
    { id: "employees", label: "Funcionários", icon: <Users size={18} /> },
    { id: "prices", label: "Preços", icon: <WalletCards size={18} />, rhOnly: true },
    { id: "periods", label: "Períodos", icon: <CalendarCheck size={18} />, rhOnly: true },
    { id: "users", label: "Usuários", icon: <ShieldCheck size={18} />, rhOnly: true }
  ] satisfies NavigationTab[]).filter((tab) => !tab.rhOnly || isRh);

  return (
    <SidebarProvider
      open={!sidebarCollapsed}
      onOpenChange={(open) => setCollapsed(!open)}
      style={{ "--sidebar-width": "17.5rem", "--sidebar-width-icon": "3.5rem" } as React.CSSProperties}
    >
      <TooltipProvider>
        <Sidebar
          tabs={tabs}
          activeTab={activeTab}
          user={session.user}
          onChangeTab={setActiveTab}
          onLogout={() => setConfirmLogout(true)}
        />

        <SidebarInset>
          <Main>
          <Topbar>
            <div className="flex items-center gap-3">
              <SidebarTrigger aria-label="Alternar menu" />
              <div>
                <Eyebrow>{selectedPeriod ? `${fullDate(selectedPeriod.startDate)} a ${fullDate(selectedPeriod.endDate)}` : "Sem período"}</Eyebrow>
                <h1 className="mt-1 font-display text-[32px] font-bold leading-none max-[820px]:text-[1.35rem] max-[820px]:leading-[1.15] max-[820px]:wrap-anywhere">{selectedPeriod?.label ?? "Sistema RH - Grupo GTF"}</h1>
              </div>
            </div>
          <Toolbar>
            <ThemeToggle />
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

        {loading && <Loading>Carregando dados...</Loading>}

        {activeTab === "dashboard" && (
          <Suspense fallback={<Loading>Carregando dashboard...</Loading>}>
            <DashboardPage dashboard={dashboard} />
          </Suspense>
        )}
        {activeTab === "records" && selectedPeriod && (
        <RecordsPage
          token={session.token}
          employees={employees}
          prices={prices}
            period={selectedPeriod}
            quantities={quantities}
            warnings={warnings}
            onChangeQuantity={(key, value) => setQuantities((current) => ({ ...current, [key]: value }))}
            onSave={async () => {
              const today = dateKeyInSaoPaulo();
              const dates = dateRange(selectedPeriod.startDate, selectedPeriod.endDate).filter((date) => date <= today);
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
              if (result.warnings.length) toast.warning("Lançamentos salvos com alertas de jornada.");
              else toast.success("Lançamentos salvos.");
              await refreshSelectedPeriod();
            }}
            onImported={async () => {
              await refreshSelectedPeriod();
              toast.success("Planilha importada e lançamentos recarregados.");
            }}
          />
        )}
        {activeTab === "employees" && (
          <EmployeesPage
            employees={employees}
            canEdit={isRh}
            token={session.token}
            onSave={async (payload, id) => {
              await api.saveEmployee(session.token, payload, id);
              await loadWorkspace(session);
              toast.success("Funcionário salvo.");
            }}
            onInactivate={async (id) => {
              await api.inactivateEmployee(session.token, id);
              await loadWorkspace(session);
              toast.success("Funcionário inativado.");
            }}
            onReload={async () => {
              await loadWorkspace(session);
            }}
          />
        )}
        {activeTab === "prices" && isRh && (
          <PricesPage
            token={session.token}
            prices={prices}
            employees={employees}
            onReload={async () => {
              await loadWorkspace(session);
            }}
          />
        )}
        {activeTab === "periods" && isRh && (
          <PeriodsPage
            periods={periods}
            token={session.token}
            onSave={async (payload) => {
              const response = await api.createPeriod(session.token, payload);
              setSelectedPeriodId(response.period.id);
              setActiveTab("records");
              await loadWorkspace(session, response.period.id);
              toast.success("Período criado.");
            }}
            onClose={async (period) => {
              setConfirmClose(period);
            }}
            onReopen={async (period) => {
              await api.reopenPeriod(session.token, period.id);
              await loadWorkspace(session);
              toast.success("Período reaberto. Os lançamentos voltaram a ficar editáveis.");
            }}
            onExport={(period) => api.downloadReport(session.token, period)}
            onReload={async () => {
              await loadWorkspace(session);
            }}
          />
        )}
        {activeTab === "users" && isRh && (
          <UsersPage
            users={users}
            onSave={async (payload, id) => {
              await api.saveUser(session.token, payload, id);
              await loadWorkspace(session);
              toast.success("Usuário salvo.");
            }}
          />
        )}
          </Main>
        </SidebarInset>
      </TooltipProvider>
      {/* Toaster fora do layout: a section vazia do sonner (sem toasts) é
          position:static e não pode ser filha de grade flexível. */}
      <Toaster position="top-center" />

      <Dialog open={confirmLogout} onOpenChange={(open) => { if (!open) setConfirmLogout(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sair do sistema?</DialogTitle>
            <DialogDescription>
              Sua sessão será encerrada e será preciso entrar de novo para continuar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmLogout(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                setConfirmLogout(false);
                logout();
              }}
            >
              Sair
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmClose !== null} onOpenChange={(open) => { if (!open) setConfirmClose(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fechar período?</DialogTitle>
            <DialogDescription>
              Fechar <strong>{confirmClose?.label}</strong> congela os totais e bloqueia lançamentos e confirmações. É possível reabrir depois com confirmação.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmClose(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={async () => {
                if (!confirmClose) return;
                const period = confirmClose;
                setConfirmClose(null);
                await api.closePeriod(session.token, period.id);
                await loadWorkspace(session);
                toast.success("Período fechado.");
              }}
            >
              Fechar período
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
