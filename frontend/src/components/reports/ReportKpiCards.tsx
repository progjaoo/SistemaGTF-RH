import { BadgeCheck, Banknote, Gauge, Users, UtensilsCrossed } from "lucide-react";
import { Badge } from "../ui/badge";
import type { PeriodSummary } from "../../types";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value ?? 0);

export default function ReportKpiCards({ summary }: { summary: PeriodSummary }) {
  const totals = summary.employeeTotals.reduce(
    (acc, row) => ({
      taken: acc.taken + row.taken,
      notTaken: acc.notTaken + row.notTaken,
      pending: acc.pending + row.pending
    }),
    { taken: 0, notTaken: 0, pending: 0 }
  );
  const launched = totals.taken + totals.notTaken + totals.pending;
  const confirmed = totals.taken + totals.notTaken;
  const confirmationRate = launched === 0 ? 0 : (confirmed / launched) * 100;

  const businessDays = summary.dailyMatrix.filter((day) => !day.isWeekend).length;
  const divisor = businessDays > 0 ? businessDays : summary.dailyMatrix.length || 1;
  const dailyAverage = summary.totalQuantity / divisor;

  const consuming = summary.employeeTotals.filter((row) => row.quantity > 0).length;

  const cards = [
    {
      icon: <UtensilsCrossed size={17} aria-hidden />,
      title: "Almoços faturados",
      value: summary.totalQuantity.toLocaleString("pt-BR"),
      detail: "Almoços confirmados (PEGUEI)"
    },
    {
      icon: <Banknote size={17} aria-hidden />,
      title: "Valor total a descontar",
      value: formatCurrency(summary.totalAmount),
      detail: `${consuming} ${consuming === 1 ? "colaborador" : "colaboradores"} na folha`
    },
    {
      icon: <Gauge size={17} aria-hidden />,
      title: "Média diária",
      value: dailyAverage.toLocaleString("pt-BR", { maximumFractionDigits: 1 }),
      detail: `Por dia útil operado (${divisor} ${divisor === 1 ? "dia" : "dias"})`
    },
    {
      icon: <Users size={17} aria-hidden />,
      title: "Colaboradores com consumo",
      value: consuming.toLocaleString("pt-BR"),
      detail: `De ${summary.employeeTotals.length.toLocaleString("pt-BR")} na folha`
    },
    {
      icon: <BadgeCheck size={17} aria-hidden />,
      title: "Taxa de confirmação",
      value: `${confirmationRate.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`,
      detail: totals.pending > 0 ? `${totals.pending} pendente(s) no portal` : "Sem pendências no portal",
      alert: totals.pending > 0
    }
  ];

  return (
    <div className="grid grid-cols-1 gap-[14px] min-[520px]:grid-cols-2 xl:grid-cols-5 max-[520px]:gap-[10px]" role="list" aria-label="Indicadores do relatório">
      {cards.map((card) => (
        <article
          key={card.title}
          role="listitem"
          className="min-w-0 rounded-lg border border-line border-l-[5px] border-l-teal bg-surface p-[18px] shadow-[0_18px_48px_rgb(32_38_44/0.08)] max-[520px]:p-[14px]"
        >
          <span className="flex items-center gap-2 text-muted">
            <span className="text-teal-deep" aria-hidden={false}>
              {card.icon}
            </span>
            <span className="truncate">{card.title}</span>
          </span>
          <strong className="my-2 block font-display text-[1.7rem] font-bold tracking-normal tabular-nums max-[520px]:text-[1.5rem]">
            {card.value}
          </strong>
          <small className="block text-muted">
            {card.detail}{" "}
            {card.alert === true && (
              <Badge variant="warn" className="ml-1">
                atenção
              </Badge>
            )}
          </small>
        </article>
      ))}
    </div>
  );
}
