import { useMemo } from "react";
import { Badge } from "../ui/badge";
import { EmptyState } from "../ui";
import type { DailyMatrixDay, EmployeeTotal } from "../../types";

const formatDay = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date(`${value}T00:00:00`));

// Espelho da grade mensal da gestora: linhas = dias, colunas = colaboradores,
// sábados/domingos sombreados, totais por dia (coluna) e por funcionário (rodapé).
export default function ReportDailyMatrixTable({
  days,
  employees
}: {
  days: DailyMatrixDay[];
  employees: EmployeeTotal[];
}) {
  const ordered = useMemo(
    () => [...employees].sort((a, b) => a.employeeName.localeCompare(b.employeeName, "pt-BR")),
    [employees]
  );

  const employeeTotals = useMemo(() => {
    const map = new Map(employees.map((row) => [row.employeeId, row.taken]));
    return map;
  }, [employees]);

  if (days.length === 0 || ordered.length === 0) {
    return <EmptyState>Sem dados de matriz para o período selecionado.</EmptyState>;
  }

  const grandTotal = ordered.reduce((acc, row) => acc + (employeeTotals.get(row.employeeId) ?? 0), 0);
  const grandDayTotal = days.reduce((acc, day) => acc + day.totalQuantity, 0);

  return (
    <div className="min-w-0 overflow-x-auto" role="region" aria-label="Matriz diária de consumo" tabIndex={0}>
      <table className="w-full border-collapse text-[0.82rem]">
        <thead>
          <tr>
            <th
              scope="col"
              className="sticky left-0 z-10 border-b border-line bg-surface px-[10px] py-[11px] text-left align-middle text-[0.78rem] whitespace-nowrap text-muted uppercase"
            >
              Data
            </th>
            <th scope="col" className="border-b border-line px-[10px] py-[11px] text-left align-middle text-[0.78rem] text-muted uppercase">
              Dia
            </th>
            <th scope="col" className="border-b border-line px-[10px] py-[11px] text-right align-middle text-[0.78rem] text-muted uppercase">
              Total
            </th>
            {ordered.map((row) => (
              <th
                key={row.employeeId}
                scope="col"
                title={row.employeeName}
                className="max-w-[120px] truncate border-b border-line px-[10px] py-[11px] text-center align-middle text-[0.78rem] text-muted uppercase"
              >
                {row.employeeName}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day.date} className={day.isWeekend ? "bg-paper" : undefined}>
              <td
                className={`sticky left-0 border-b border-line px-[10px] py-[8px] font-bold whitespace-nowrap tabular-nums ${
                  day.isWeekend ? "bg-paper" : "bg-surface"
                }`}
              >
                {formatDay(day.date)}
              </td>
              <td className="border-b border-line px-[10px] py-[8px] whitespace-nowrap text-muted">
                {day.weekdayLabel}
                {day.isWeekend && (
                  <Badge variant="muted" className="ml-1">
                    fds
                  </Badge>
                )}
              </td>
              <td className="border-b border-line px-[10px] py-[8px] text-right font-bold tabular-nums">{day.totalQuantity}</td>
              {ordered.map((employee) => (
                <td key={employee.employeeId} className="border-b border-line px-[6px] py-[8px] text-center align-middle">
                  <MatrixCell
                    quantity={day.entries[employee.employeeId]?.quantity}
                    status={day.entries[employee.employeeId]?.confirmationStatus ?? "NONE"}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-teal-bg/60 font-bold">
            <td className="sticky left-0 bg-teal-bg px-[10px] py-[11px] whitespace-nowrap">Total</td>
            <td className="px-[10px] py-[11px] tabular-nums" aria-label={`${days.length} dias`}>
              {days.length}d
            </td>
            <td className="px-[10px] py-[11px] text-right tabular-nums text-teal-deep">{grandDayTotal}</td>
            {ordered.map((employee) => (
              <td key={employee.employeeId} className="px-[6px] py-[11px] text-center tabular-nums">
                {employeeTotals.get(employee.employeeId) ?? 0}
              </td>
            ))}
          </tr>
          <tr aria-hidden className="text-muted">
            <td colSpan={3 + ordered.length} className="px-[10px] py-[8px] text-[0.78rem] font-normal">
              Total geral da matriz: {grandTotal} almoços faturados.
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function MatrixCell({ quantity, status }: { quantity: number | undefined; status: string }) {
  if (quantity === undefined || quantity === null || status === "NONE") {
    return (
      <span aria-label="Sem lançamento" className="text-muted opacity-40">
        —
      </span>
    );
  }
  if (status === "PENDING") {
    return <Badge variant="warn">{quantity}</Badge>;
  }
  if (status === "NAO_PEGUEI" || quantity === 0) {
    return (
      <Badge variant="muted" aria-label="Não pegou">
        0
      </Badge>
    );
  }
  return <Badge variant="good">{quantity}</Badge>;
}
