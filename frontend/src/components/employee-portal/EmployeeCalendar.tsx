import { UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DayPicker, type DayButtonProps } from "react-day-picker";
import "react-day-picker/style.css";
import { ptBR } from "date-fns/locale";
import styled from "styled-components";
import type { ConfirmationStatus, EmployeePortalDay, EmployeePortalSearchResult } from "../../types";
import { dateKeyInSaoPaulo } from "../../utils/date";
import { EmptyState } from "../ui";
import { DayCheckin } from "./DayCheckin";

function parseKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dotClass(modifiers: Record<string, boolean>) {
  if (modifiers.closed) return "dot dot-closed";
  if (modifiers.confirmed) return "dot dot-confirmed";
  if (modifiers.late) return "dot dot-late";
  if (modifiers.launched) return "dot dot-pending";
  return "dot";
}

function LaunchDayButton(props: DayButtonProps) {
  const { day, modifiers, ...rest } = props;
  return (
    <button {...rest} type="button">
      <span>{day.date.getDate()}</span>
      {(modifiers.launched || modifiers.closed) && <span className={dotClass(modifiers)} aria-hidden="true" />}
    </button>
  );
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
  onCheckin: (date: string, status: Exclude<ConfirmationStatus, "PENDING">, note?: string) => void;
  onBack: () => void;
}) {
  const today = dateKeyInSaoPaulo();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  useEffect(() => {
    setSelectedKey(null);
  }, [month, employee.id]);

  const byDate = useMemo(() => new Map(days.map((day) => [day.date, day])), [days]);

  const modifiers = useMemo(() => {
    const launched: Date[] = [];
    const confirmed: Date[] = [];
    const late: Date[] = [];
    const closed: Date[] = [];
    for (const day of days) {
      const date = parseKey(day.date);
      launched.push(date);
      if (day.period.status === "CLOSED") closed.push(date);
      else if (day.confirmationStatus !== "PENDING") confirmed.push(date);
      else if (day.date < today) late.push(date);
    }
    return { launched, confirmed, late, closed };
  }, [days, today]);

  const selectedDay = selectedKey ? byDate.get(selectedKey) : undefined;
  const monthDate = useMemo(() => parseKey(`${month}-01`), [month]);
  const endMonth = useMemo(() => parseKey(`${currentMonth}-01`), [currentMonth]);

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

      {error && <CalendarError>{error}</CalendarError>}

      {loading ? (
        <EmptyState>Carregando calendário...</EmptyState>
      ) : (
        <>
          <MonthGrid>
            <DayPicker
              mode="single"
              locale={ptBR}
              month={monthDate}
              onMonthChange={(next) => onMonthChange(toKey(next).slice(0, 7))}
              endMonth={endMonth}
              selected={selectedKey ? parseKey(selectedKey) : undefined}
              onDayClick={(date, mods) => {
                if (mods.disabled) return;
                setSelectedKey(toKey(date));
              }}
              disabled={{ after: parseKey(today) }}
              modifiers={modifiers}
              modifiersClassNames={{
                launched: "day-launched",
                confirmed: "day-confirmed",
                late: "day-late",
                closed: "day-closed"
              }}
              components={{ DayButton: LaunchDayButton }}
            />
          </MonthGrid>
          <Legend>
            <span><i className="dot dot-pending" /> A confirmar</span>
            <span><i className="dot dot-late" /> Atrasado</span>
            <span><i className="dot dot-confirmed" /> Confirmado</span>
            <span><i className="dot dot-closed" /> Período fechado</span>
          </Legend>
          <DayCheckin
            day={selectedDay}
            today={today}
            saving={selectedDay ? savingDate === selectedDay.date : false}
            onCheckin={onCheckin}
          />
        </>
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

  .rdp-root {
    --rdp-accent-color: var(--teal);
    --rdp-accent-background-color: var(--teal-soft);
    --rdp-day-height: 44px;
    --rdp-day-width: 44px;
    margin: 0 auto;
  }

  .rdp-day_button {
    position: relative;
    min-height: 44px;
    min-width: 44px;
    border-radius: 8px;
    font-weight: 800;

    .dot {
      position: absolute;
      left: 50%;
      bottom: 5px;
      transform: translateX(-50%);
      width: 7px;
      height: 7px;
      border-radius: 50%;
    }
  }

  .day-late .rdp-day_button {
    border: 1px solid #f59e0b;
  }

  .day-closed .rdp-day_button {
    color: var(--muted);
  }

  .dot-pending {
    background: var(--amber, #f59e0b);
  }

  .dot-late {
    background: #dc2626;
  }

  .dot-confirmed {
    background: var(--teal);
  }

  .dot-closed {
    background: #9ca3af;
  }

  .dot {
    display: inline-block;
    width: 7px;
    height: 7px;
    border-radius: 50%;
  }
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

const MonthGrid = styled.div`
  display: grid;
  justify-items: center;
`;

const Legend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  color: var(--muted);
  font-size: 0.82rem;
  font-weight: 750;

  span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
`;

const CalendarError = styled.div`
  padding: 10px 12px;
  border: 1px solid #fecaca;
  border-radius: 8px;
  background: #fff1f2;
  color: #b91c1c;
  font-weight: 800;
`;
