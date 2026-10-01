import { WalletCards } from "lucide-react";
import type { ConfirmationStatus, EmployeePortalResumo } from "../../types";
import { formatCurrency } from "../../utils/format";

const STATUS_LABEL: Record<ConfirmationStatus, string> = {
  PEGUEI: "Pegou",
  NAO_PEGUEI: "Não pegou",
  PENDING: "Pendente"
};

const shortDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date(`${value}T00:00:00`));

// "Meu desconto": valor vigente por almoço, desconto previsto no mês e
// lista de lançamentos. Sem período cobrindo o mês, orienta a procurar o RH.
export function EmployeeDiscountSummary({ summary, loading, error }: {
  summary: EmployeePortalResumo | null;
  loading: boolean;
  error: string;
}) {
  return (
    <section className="grid w-[min(760px,100%)] gap-4 rounded-lg border border-line bg-surface p-5 shadow-[0_18px_48px_rgb(32_38_44/0.08)]">
      <div className="flex items-center gap-[10px]">
        <WalletCards size={22} className="text-teal-deep" />
        <div>
          <span className="block text-[0.78rem] font-extrabold uppercase text-muted">Auditoria</span>
          <strong className="block text-[1.25rem]">Meu desconto</strong>
        </div>
        {summary?.period && (
          <span className={`ml-auto rounded-md border px-2 py-1 text-[0.78rem] font-extrabold uppercase ${summary.period.status === "CLOSED" ? "border-line bg-surface text-muted" : "border-teal bg-teal-bg text-teal-deep"}`}>
            {summary.period.status === "CLOSED" ? "Fechado" : "Aberto"}
          </span>
        )}
      </div>

      {error && <div className="rounded-lg border border-danger/30 bg-danger/5 px-[10px] py-[10px] font-extrabold text-danger-ink">{error}</div>}

      {loading ? (
        <div className="rounded-lg border border-dashed border-line bg-surface/70 p-7 text-muted">Carregando desconto...</div>
      ) : !summary || !summary.period ? (
        <div className="rounded-lg border border-dashed border-line bg-surface/70 p-7 text-muted">
          Procure o RH — nenhum período cobre este mês.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 max-[520px]:grid-cols-1">
            <div className="rounded-lg border border-line p-4">
              <span className="block text-[0.78rem] font-extrabold uppercase text-muted">Valor por almoço</span>
              <strong className="block text-[1.6rem] tabular-nums">{formatCurrency(summary.unitPrice)}</strong>
              <span className="block text-[0.82rem] text-muted">vigente hoje</span>
            </div>
            <div className="rounded-lg border border-line p-4">
              <span className="block text-[0.78rem] font-extrabold uppercase text-muted">
                {summary.period.status === "CLOSED" ? "Descontado" : "Desconto previsto"}
              </span>
              <strong className="block text-[1.6rem] tabular-nums">{formatCurrency(summary.totals.forecastAmount)}</strong>
              <span className="block text-[0.82rem] text-muted">
                {summary.totals.taken} {summary.totals.taken === 1 ? "almoço (Pegou)" : "almoços (Pegou)"} · {summary.period.label}
              </span>
            </div>
          </div>

          {summary.launches.length === 0 ? (
            <div className="rounded-lg border border-dashed border-line bg-surface/70 p-7 text-muted">
              Nenhum lançamento neste mês. Marque seus dias no calendário acima.
            </div>
          ) : (
            <ul className="grid gap-2">
              {summary.launches.map((launch) => (
                <li key={launch.date} className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="tabular-nums font-extrabold">{shortDate(launch.date)}</span>
                    <span className="truncate text-[0.85rem] text-muted">{STATUS_LABEL[launch.confirmationStatus]}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-[0.9rem]">{formatCurrency(launch.amount)}</span>
                </li>
              ))}
            </ul>
          )}
          {summary.period.status === "OPEN" ? (
            <p className="text-[0.82rem] text-muted">Pendente ainda não conta no desconto — confirme no calendário.</p>
          ) : (
            <p className="text-[0.82rem] text-muted">Valores finais do fechamento.</p>
          )}
        </>
      )}
    </section>
  );
}
