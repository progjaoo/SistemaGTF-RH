import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { api } from "../../api";
import { BrandLogo } from "../../components/layout";
import { EmployeeCalendar } from "../../components/employee-portal/EmployeeCalendar";
import { NameSearch } from "../../components/employee-portal/NameSearch";
import logoGtf from "../../images/logogtf.png";
import type { ConfirmationStatus, EmployeePortalDay, EmployeePortalSearchResult } from "../../types";
import { monthKeyInSaoPaulo } from "../../utils/date";

export default function EmployeePortalPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EmployeePortalSearchResult[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeePortalSearchResult | null>(null);
  const [month, setMonth] = useState(monthKeyInSaoPaulo);
  const [days, setDays] = useState<EmployeePortalDay[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [savingDate, setSavingDate] = useState("");
  const [searchError, setSearchError] = useState("");
  const [calendarError, setCalendarError] = useState("");
  const currentMonth = useMemo(() => monthKeyInSaoPaulo(), []);

  async function search() {
    setLoadingSearch(true);
    setSearchError("");
    setResults([]);
    try {
      const response = await api.employeePortalSearch(query);
      if (response.employees.length === 0) {
        setSearchError("Nenhum funcionário ativo encontrado. Procure o RH para conferir seu cadastro.");
      } else if (response.employees.length === 1) {
        setSelectedEmployee(response.employees[0]);
      } else {
        setResults(response.employees);
      }
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "Não foi possível buscar funcionário.");
    } finally {
      setLoadingSearch(false);
    }
  }

  useEffect(() => {
    if (!selectedEmployee) return;

    let ignore = false;
    setLoadingCalendar(true);
    setCalendarError("");

    api.employeePortalCalendar(selectedEmployee.id, month)
      .then((response) => {
        if (!ignore) setDays(response.days);
      })
      .catch((error) => {
        if (!ignore) setCalendarError(error instanceof Error ? error.message : "Não foi possível carregar o calendário.");
      })
      .finally(() => {
        if (!ignore) setLoadingCalendar(false);
      });

    return () => {
      ignore = true;
    };
  }, [month, selectedEmployee]);

  async function checkin(date: string, status: Exclude<ConfirmationStatus, "PENDING">) {
    if (!selectedEmployee) return;

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
      const response = await api.employeePortalCheckin(selectedEmployee.id, date, status);
      setDays((currentDays) => currentDays.map((day) => (day.id === response.record.id ? response.record : day)));
    } catch (error) {
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

      {!selectedEmployee ? (
        <NameSearch
          query={query}
          results={results}
          loading={loadingSearch}
          error={searchError}
          onQueryChange={setQuery}
          onSearch={search}
          onSelect={(employee) => {
            setSelectedEmployee(employee);
            setResults([]);
          }}
        />
      ) : (
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
            setSelectedEmployee(null);
            setDays([]);
            setCalendarError("");
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
