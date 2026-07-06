import { ChevronLeft, ChevronRight, UserRound } from "lucide-react";
import styled from "styled-components";
import type { ConfirmationStatus, EmployeePortalDay, EmployeePortalSearchResult } from "../../types";
import { dateKeyInSaoPaulo } from "../../utils/date";
import { EmptyState, IconButton } from "../ui";
import { DayCheckin } from "./DayCheckin";

function shiftMonth(month: string, delta: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(month: string) {
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(`${month}-01T00:00:00`));
}

export function EmployeeCalendar({
  employee,
  month,
  currentMonth,
  days,
  loading,
  savingDate,
  error,
  onMonthChange,
  onCheckin,
  onBack
}: {
  employee: EmployeePortalSearchResult;
  month: string;
  currentMonth: string;
  days: EmployeePortalDay[];
  loading: boolean;
  savingDate: string;
  error: string;
  onMonthChange: (month: string) => void;
  onCheckin: (date: string, status: Exclude<ConfirmationStatus, "PENDING">) => void;
  onBack: () => void;
}) {
  const previousMonth = shiftMonth(month, -1);
  const nextMonth = shiftMonth(month, 1);
  const today = dateKeyInSaoPaulo();

  return (
    <CalendarPanel>
      <CalendarHeader>
        <EmployeeTitle>
          <UserRound size={22} />
          <div>
            <span>Colaborador</span>
            <strong>{employee.name}</strong>
          </div>
        </EmployeeTitle>
        <button type="button" onClick={onBack}>Trocar nome</button>
      </CalendarHeader>

      <MonthNav>
        <IconButton type="button" title="Mês anterior" onClick={() => onMonthChange(previousMonth)}>
          <ChevronLeft size={18} />
        </IconButton>
        <strong>{monthLabel(month)}</strong>
        <IconButton type="button" title="Próximo mês" onClick={() => onMonthChange(nextMonth)} disabled={nextMonth > currentMonth}>
          <ChevronRight size={18} />
        </IconButton>
      </MonthNav>

      {error && <CalendarError>{error}</CalendarError>}

      {loading ? (
        <EmptyState>Carregando calendário...</EmptyState>
      ) : days.length === 0 ? (
        <EmptyState>Nenhum almoço lançado para este mês.</EmptyState>
      ) : (
        <DaysGrid>
          {days.map((day) => (
            <DayCheckin
              key={day.id}
              day={day}
              disabled={day.date > today || day.period.status === "CLOSED"}
              saving={savingDate === day.date}
              onCheckin={onCheckin}
            />
          ))}
        </DaysGrid>
      )}
    </CalendarPanel>
  );
}

const CalendarPanel = styled.section`
  display: grid;
  gap: 16px;
  width: min(760px, 100%);
  padding: 20px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow);
`;

const CalendarHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  > button {
    min-height: 38px;
    padding: 8px 10px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: #fff;
    color: var(--teal);
    font-weight: 850;
  }

  @media (max-width: 520px) {
    align-items: flex-start;
    flex-direction: column;
  }
`;

const EmployeeTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;

  svg {
    color: var(--teal);
  }

  span {
    display: block;
    color: var(--muted);
    font-size: 0.78rem;
    font-weight: 800;
    text-transform: uppercase;
  }

  strong {
    display: block;
    font-size: 1.25rem;
  }
`;

const MonthNav = styled.div`
  display: grid;
  grid-template-columns: 40px 1fr 40px;
  align-items: center;
  gap: 10px;

  strong {
    text-align: center;
    text-transform: capitalize;
  }

  ${IconButton} {
    color: var(--ink);
    border-color: var(--line);
  }
`;

const DaysGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 10px;
`;

const CalendarError = styled.div`
  padding: 10px 12px;
  border: 1px solid #fecaca;
  border-radius: 8px;
  background: #fff1f2;
  color: #b91c1c;
  font-weight: 800;
`;
