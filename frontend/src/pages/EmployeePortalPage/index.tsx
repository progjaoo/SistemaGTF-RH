import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "../../api";
import { BrandLogo } from "../../components/layout";
import { AccessCodeStep } from "../../components/employee-portal/AccessCodeStep";
import { EmployeeCalendar } from "../../components/employee-portal/EmployeeCalendar";
import { EmployeeDiscountSummary } from "../../components/employee-portal/EmployeeDiscountSummary";
import { NameSearch } from "../../components/employee-portal/NameSearch";
import logoGtf from "../../images/logogtf.png";
import type { ConfirmationStatus, EmployeePortalDay, EmployeePortalResumo, EmployeePortalSearchResult } from "../../types";
import { monthKeyInSaoPaulo } from "../../utils/date";

const TOKEN_KEY = "gtf-portal-token";
const EMPLOYEE_KEY = "gtf-portal-employee";

type Step = "search" | "code" | "calendar";

function loadSession(): { token: string; employee: EmployeePortalSearchResult } | null {
  try {
    // "Manter conectado" (30 dias) vive no localStorage; sessão de turno (8h), no sessionStorage.
    const stores = [localStorage, sessionStorage];
    for (const store of stores) {
      const token = store.getItem(TOKEN_KEY);
      const raw = store.getItem(EMPLOYEE_KEY);
      if (token && raw) return { token, employee: JSON.parse(raw) as EmployeePortalSearchResult };
    }
    return null;
  } catch {
    return null;
  }
}

export default function EmployeePortalPage() {
  const [step, setStep] = useState<Step>(() => (loadSession() ? "calendar" : "search"));
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EmployeePortalSearchResult[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeePortalSearchResult | null>(() => loadSession()?.employee ?? null);
  const [portalToken, setPortalToken] = useState(() => loadSession()?.token ?? "");
  const [month, setMonth] = useState(monthKeyInSaoPaulo);
  const [days, setDays] = useState<EmployeePortalDay[]>([]);
  const [summary, setSummary] = useState<EmployeePortalResumo | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingCode, setLoadingCode] = useState(false);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [savingDate, setSavingDate] = useState("");
  const [searchError, setSearchError] = useState("");
  const [codeError, setCodeError] = useState("");
  const [calendarError, setCalendarError] = useState("");
  const [installEvent, setInstallEvent] = useState<Event | null>(null);
  const currentMonth = useMemo(() => monthKeyInSaoPaulo(), []);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function installApp() {
    const evt = installEvent as unknown as { prompt: () => Promise<void> } | null;
    if (!evt) return;
    await evt.prompt();
    setInstallEvent(null);
  }

  function clearSession() {
    for (const store of [localStorage, sessionStorage]) {
      store.removeItem(TOKEN_KEY);
      store.removeItem(EMPLOYEE_KEY);
    }
    setPortalToken("");
    setSelectedEmployee(null);
    setDays([]);
    setSummary(null);
    setSummaryError("");
  }

  async function search() {
    setLoadingSearch(true);
    setSearchError("");
    setResults([]);
    try {
      const response = await api.employeePortalSearch(query);
      if (response.employees.length === 0) {
        setSearchError("Nenhum funcionário ativo encontrado. Procure o RH para conferir seu cadastro.");
      } else {
        setResults(response.employees);
      }
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "Não foi possível buscar funcionário.");
    } finally {
      setLoadingSearch(false);
    }
  }

  function selectEmployee(employee: EmployeePortalSearchResult) {
    setResults([]);
    if (!employee.hasAccess) {
      setSearchError("Seu acesso ainda não foi ativado. Procure o RH para receber seu código.");
      return;
    }
    setSelectedEmployee(employee);
    setCodeError("");
    setStep("code");
  }

  async function submitCode(code: string, remember: boolean) {
    if (!selectedEmployee) return;
    setLoadingCode(true);
    setCodeError("");
    try {
      const response = await api.employeePortalLogin(selectedEmployee.id, code, remember);
      const storage = remember ? localStorage : sessionStorage;
      storage.setItem(TOKEN_KEY, response.token);
      storage.setItem(EMPLOYEE_KEY, JSON.stringify(response.employee));
      setPortalToken(response.token);
      setSelectedEmployee(response.employee);
      setStep("calendar");
    } catch (error) {
      setCodeError(error instanceof Error ? error.message : "Não foi possível verificar o código.");
    } finally {
      setLoadingCode(false);
    }
  }

  function handleExpiredSession() {
    clearSession();
    setCodeError("Sessão expirada. Digite seu código de novo.");
    setStep("search");
  }

  useEffect(() => {
    if (step !== "calendar" || !selectedEmployee || !portalToken) return;

    let ignore = false;
    setLoadingCalendar(true);
    setCalendarError("");
    setLoadingSummary(true);
    setSummaryError("");

    api.employeePortalCalendar(selectedEmployee.id, month, portalToken)
      .then((response) => {
        if (!ignore) setDays(response.days);
      })
      .catch((error) => {
        if (ignore) return;
        if (error instanceof Error && /expirada|autenticado|inválida/i.test(error.message)) {
          handleExpiredSession();
        } else {
          setCalendarError(error instanceof Error ? error.message : "Não foi possível carregar o calendário.");
        }
      })
      .finally(() => {
        if (!ignore) setLoadingCalendar(false);
      });

    api.employeePortalSummary(selectedEmployee.id, month, portalToken)
      .then((response) => {
        if (!ignore) setSummary(response);
      })
      .catch((error) => {
        if (ignore) return;
        if (error instanceof Error && /expirada|autenticado|inválida/i.test(error.message)) {
          handleExpiredSession();
        } else {
          setSummaryError(error instanceof Error ? error.message : "Não foi possível carregar o desconto.");
        }
      })
      .finally(() => {
        if (!ignore) setLoadingSummary(false);
      });

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, selectedEmployee, portalToken, step]);

  async function checkin(date: string, status: Exclude<ConfirmationStatus, "PENDING">, note?: string) {
    if (!selectedEmployee || !portalToken) return;

    const previousDays = days;
    setSavingDate(date);
    setCalendarError("");
    setDays((currentDays) =>
      currentDays.map((day) =>
        day.date === date
          ? { ...day, confirmationStatus: status, confirmationSource: "SISTEMA", confirmedAt: new Date().toISOString() }
          : day
      )
    );

    try {
      const response = await api.employeePortalCheckin(selectedEmployee.id, date, status, portalToken, note);
      setDays((currentDays) =>
        currentDays.some((day) => day.id === response.record.id)
          ? currentDays.map((day) => (day.id === response.record.id ? response.record : day))
          : [...currentDays, response.record].sort((a, b) => a.date.localeCompare(b.date))
      );
      // O desconto previsto muda a cada marcação — recarrega o resumo do mês.
      try {
        setSummary(await api.employeePortalSummary(selectedEmployee.id, month, portalToken));
      } catch {
        /* o calendário já atualizou; o resumo tenta de novo na próxima troca de mês */
      }
      if (status === "NAO_PEGUEI") toast.info("Registrado: você não pegou o almoço.");
    } catch (error) {
      if (error instanceof Error && /expirada|autenticado|inválida/i.test(error.message)) {
        setDays(previousDays);
        handleExpiredSession();
        return;
      }
      setDays(previousDays);
      const message = error instanceof Error ? error.message : "Não foi possível salvar a confirmação.";
      setCalendarError(message);
      toast.error(message);
    } finally {
      setSavingDate("");
    }
  }

  return (
    <main className="grid min-h-[100dvh] content-start justify-items-center gap-5 bg-paper bg-[linear-gradient(90deg,rgb(43_168_162/0.08)_0_1px,transparent_1px_100%)] bg-[length:42px_42px] p-[clamp(18px,5vw,42px)] dark:bg-[linear-gradient(90deg,rgb(43_168_162/0.05)_0_1px,transparent_1px_100%)]">
      <header className="flex w-[min(760px,100%)] flex-wrap items-center gap-[14px] text-ink">
        <BrandLogo src={logoGtf} alt="Grupo GTF" className="h-[54px] w-[92px]" />
        <div className="min-w-0 flex-1">
          <strong className="block text-[1.05rem]">GTF - Recursos Humanos</strong>
          <span className="block font-bold text-muted">Controle de Almoços</span>
        </div>
        {installEvent && (
          <button
            type="button"
            onClick={() => void installApp()}
            className="min-h-10 rounded-lg bg-teal-ink px-3 py-2 text-[0.85rem] font-extrabold text-white"
          >
            Instalar app
          </button>
        )}
      </header>

      {step === "search" && (
        <NameSearch
          query={query}
          results={results}
          loading={loadingSearch}
          error={searchError}
          onQueryChange={setQuery}
          onSearch={search}
          onSelect={selectEmployee}
        />
      )}

      {step === "code" && selectedEmployee && (
        <AccessCodeStep
          employee={selectedEmployee}
          loading={loadingCode}
          error={codeError}
          onSubmit={submitCode}
          onBack={() => {
            setSelectedEmployee(null);
            setStep("search");
          }}
        />
      )}

      {step === "calendar" && selectedEmployee && (
        <>
          <EmployeeCalendar
            employee={selectedEmployee}
            portalToken={portalToken}
            month={month}
            currentMonth={currentMonth}
            days={days}
            loading={loadingCalendar}
            savingDate={savingDate}
            error={calendarError}
            onMonthChange={setMonth}
            onCheckin={checkin}
            onBack={() => {
              clearSession();
              setCalendarError("");
              setStep("search");
            }}
          />
          <EmployeeDiscountSummary summary={summary} loading={loadingSummary} error={summaryError} />
        </>
      )}
    </main>
  );
}
