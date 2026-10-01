import { CalendarCheck2 } from "lucide-react";
import type { ConfirmationStatus, EmployeePortalDay, EmployeePortalLaunch } from "../../types";
import { formatCurrency } from "../../utils/format";

const shortDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", weekday: "short" }).format(new Date(`${value}T00:00:00`));

const STATUS_LABEL: Record<ConfirmationStatus, string> = {
  PEGUEI: "Pegou",
  NAO_PEGUEI: "Não pegou",
  PENDING: "Pendente"
};

const pad2 = (value: number) => String(value).padStart(2, "0");

function monthDays(month: string): string[] {
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  return Array.from({ length: lastDay }, (_, index) => `${month}-${pad2(index + 1)}`);
}

// Conferência do mês dia a dia: cruza os dias do calendário (status +
// período) com os lançamentos do resumo (valor). Dias sem lançamento e dias
// futuros aparecem neutros; pendente é sinalizado como fora do desconto.
export function EmployeeMonthConference({ month, days, launches, loading, today }: {
  month: string;
  days: EmployeePortalDay[];
  launches: EmployeePortalLaunch[];
  loading: boolean;
  today: string;
}) {
  const byDay = new Map(days.map((day) => [day.date, day]));
  const valueByDay = new Map(launches.map((launch) => [launch.date, launch.amount]));
  const keys = monthDays(month);
  const pendingCount = days.filter((day) => day.confirmationStatus === "PENDING" && day.date <= today).length;

  return (
    <section className="grid w-[min(760px,100%)] gap-4 rounded-lg border border-line bg-surface p-5 shadow-[0_18px_48px_rgb(32_38_44/0.08)]">
      <div className="flex items-center gap-[10px]">
        <CalendarCheck2 size={22} className="text-teal-deep" />
        <div>
          <span className="block text-[0.78rem] font-extrabold uppercase text-muted">Conferência</span>
          <strong className="block text-[1.25rem]">Meu mês dia a dia</strong>
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border border-dashed border-line bg-surface/70 p-7 text-muted">Carregando conferência...</div>
      ) : (
        <>
          {pendingCount > 0 && (
            <p className="rounded-lg border border-line bg-teal-bg/40 px-3 py-2 text-[0.85rem] font-bold">
              {pendingCount} {pendingCount === 1 ? "dia pendente" : "dias pendentes"} — não entram no desconto. Toque no dia no calendário para marcar.
            </p>
          )}
          <ul className="grid max-h-80 gap-2 overflow-auto">
            {keys.map((key) => {
              const day = byDay.get(key);
              const future = key > today;
              const closed = day?.period.status === "CLOSED";
              return (
                <li key={key} className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="shrink-0 tabular-nums font-extrabold">{shortDate(key)}</span>
                    {closed && (
                      <span className="shrink-0 rounded border border-line px-1 text-[0.72rem] font-extrabold uppercase text-muted">fechado</span>
                    )}
                    <span className="truncate text-[0.85rem] text-muted">
                      {future ? "—" : day ? STATUS_LABEL[day.confirmationStatus] : "sem lançamento"}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums text-[0.9rem]">
                    {!future && day && day.confirmationStatus !== "PENDING"
                      ? formatCurrency(valueByDay.get(key) ?? 0)
                      : "—"}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
