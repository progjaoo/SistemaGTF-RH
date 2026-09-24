import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { api } from "../../api";
import { BrandLogo } from "../../components/layout";
import { AccessCodeStep } from "../../components/employee-portal/AccessCodeStep";
import { EmployeeCalendar } from "../../components/employee-portal/EmployeeCalendar";
import { NameSearch } from "../../components/employee-portal/NameSearch";
import logoGtf from "../../images/logogtf.png";
import type { ConfirmationStatus, EmployeePortalDay, EmployeePortalSearchResult } from "../../types";
import { monthKeyInSaoPaulo } from "../../utils/date";

const TOKEN_KEY = "gtf-portal-token";
const EMPLOYEE_KEY = "gtf-portal-employee";

type Step = "search" | "code" | "calendar";

function loadSession(): { token: string; employee: EmployeePortalSearchResult } | null {
  try {
    const token = sessionStorage.getItem(TOKEN_KEY);
    const raw = sessionStorage.getItem(EMPLOYEE_KEY);
    if (!token || !raw) return null;
    return { token, employee: JSON.parse(raw) as EmployeePortalSearchResult };
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
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingCode, setLoadingCode] = useState(false);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [savingDate, setSavingDate] = useState("");
  const [searchError, setSearchError] = useState("");
  const [codeError, setCodeError] = useState("");
  const [calendarError, setCalendarError] = useState("");
  const currentMonth = useMemo(() => monthKeyInSaoPaulo(), []);

  function clearSession() {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(EMPLOYEE_KEY);
    setPortalToken("");
    setSelectedEmployee(null);
    setDays([]);
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

  async function submitCode(code: string) {
    if (!selectedEmployee) return;
    setLoadingCode(true);
    setCodeError("");
    try {
      const response = await api.employeePortalLogin(selectedEmployee.id, code);
      sessionStorage.setItem(TOKEN_KEY, response.token);
      sessionStorage.setItem(EMPLOYEE_KEY, JSON.stringify(response.employee));
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
      setDays((currentDays) => currentDays.map((day) => (day.id === response.record.id ? response.record : day)));
    } catch (error) {
      if (error instanceof Error && /expirada|autenticado|inválida/i.test(error.message)) {
        setDays(previousDays);
        handleExpiredSession();
        return;
      }
      setDays(previousDays);
      setCalendarError(error instanceof Error ? error.message : "Não foi possível salvar a confirmação.");
    } finally {
      setSavingDate("");
    }
  }

  return (
    <PortalLayout>
      <PortalHeader>
        <BrandLogo src={logoGtf} alt="Grupo GTF" />
        <div>
          <strong>GTF - Recursos Humanos</strong>
          <span>Controle de Almoços</span>
        </div>
      </PortalHeader>

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
        <EmployeeCalendar
          employee={selectedEmployee}
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
      )}
    </PortalLayout>
  );
}

const PortalLayout = styled.main`
  display: grid;
  align-content: start;
  justify-items: center;
  gap: 20px;
  min-height: 100vh;
  padding: clamp(18px, 5vw, 42px);
  background:
    linear-gradient(90deg, rgba(15, 118, 110, 0.08) 0 1px, transparent 1px 100%) 0 0 / 42px 42px,
    var(--paper);
`;

const PortalHeader = styled.header`
  display: flex;
  align-items: center;
  gap: 14px;
  width: min(760px, 100%);
  color: var(--ink);

  ${BrandLogo} {
    width: 92px;
    height: 54px;
  }

  strong,
  span {
    display: block;
  }

  strong {
    font-size: 1.05rem;
  }

  span {
    color: var(--muted);
    font-weight: 750;
  }
`;
