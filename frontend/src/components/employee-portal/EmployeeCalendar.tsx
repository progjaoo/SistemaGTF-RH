import { UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DayPicker, type DayButtonProps } from "react-day-picker";
import "react-day-picker/style.css";
import { ptBR } from "date-fns/locale";
import type { ConfirmationStatus, EmployeePortalDay, EmployeePortalSearchResult } from "../../types";
import { dateKeyInSaoPaulo } from "../../utils/date";
import { cn } from "@/lib/utils";
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
    <section className="portal-calendar grid w-[min(760px,100%)] gap-4 rounded-lg border border-line bg-surface p-5 shadow-[0_18px_48px_rgb(32_38_44/0.08)]">
      <div className="flex items-center justify-between gap-3 max-[520px]:flex-col max-[520px]:items-start">
        <div className="flex items-center gap-[10px]">
          <UserRound size={22} className="text-teal-deep" />
          <div>
            <span className="block text-[0.78rem] font-extrabold uppercase text-muted">Colaborador</span>
            <strong className="block text-[1.25rem]">{employee.name}</strong>
          </div>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="min-h-[38px] rounded-lg border border-line bg-white px-[10px] py-2 font-extrabold text-teal-deep"
        >
          Trocar nome
        </button>
      </div>

      {error && <div className="rounded-lg border border-danger/30 bg-danger/5 px-[10px] py-[10px] font-extrabold text-danger">{error}</div>}

      {loading ? (
        <div className="rounded-lg border border-dashed border-line bg-white/70 p-7 text-muted">Carregando calendário...</div>
      ) : (
        <>
          <div className="grid justify-items-center">
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
          </div>
          <div className="flex flex-wrap gap-3 text-[0.82rem] font-bold text-muted [&>span]:inline-flex [&>span]:items-center [&>span]:gap-[6px]">
            <span><i className="dot dot-pending" /> A confirmar</span>
            <span><i className="dot dot-late" /> Atrasado</span>
            <span><i className="dot dot-confirmed" /> Confirmado</span>
            <span><i className="dot dot-closed" /> Período fechado</span>
          </div>
          <DayCheckin
            day={selectedDay}
            today={today}
            saving={selectedDay ? savingDate === selectedDay.date : false}
            onCheckin={onCheckin}
          />
        </>
      )}
    </section>
  );
}
