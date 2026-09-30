import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Panel, PanelHeader, EmptyState } from "../ui";
import ActionGuide from "../ActionGuide";
import type { PeriodSummary } from "../../types";
import type { Tab } from "../../navigation";

const formatCurrency = (value: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value ?? 0);

const shortDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date(`${value}T00:00:00`));

const compactCurrency = (value: number) =>
  value >= 1000
    ? `R$${(value / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k`
    : `R$${value.toLocaleString("pt-BR")}`;

// Tooltip escuro consistente com o padrão do DashboardView.
// Texto sempre branco: o Tooltip padrão do recharts herdava cor preta
// dentro do contentStyle escuro e ficava ilegível no hover.
const tooltipStyle = { background: "#20262c", color: "#fff", border: "none", borderRadius: 8 };

function EvolutionTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number | string }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  const quantity = Number(payload[0]?.value ?? 0);
  const amount = Number(payload[1]?.value ?? 0);
  return (
    <div style={tooltipStyle} className="px-3 py-2 text-[0.82rem]">
      <strong className="block">{label}</strong>
      <span className="block tabular-nums">{quantity} refeições</span>
      <span className="block tabular-nums">{formatCurrency(amount)} faturado</span>
    </div>
  );
}

function ConfirmationTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name?: string; value?: number | string; payload?: { name?: string } }> }) {
  if (!active || !payload || payload.length === 0) return null;
  const total = payload.reduce((acc, entry) => acc + Number(entry.value ?? 0), 0);
  return (
    <div style={{ ...tooltipStyle, color: "#fff" }} className="px-3 py-2 text-[0.82rem]">
      {payload.map((entry, index) => {
        const name = String(entry.name ?? entry.payload?.name ?? "Lançamentos");
        const value = Number(entry.value ?? 0);
        const percent = total > 0 ? ` · ${(value / total * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : "";
        return (
          <div key={`${name}-${index}`} className="flex items-center justify-between gap-3 tabular-nums">
            <span>{name}</span>
            <strong>{value.toLocaleString("pt-BR")}{percent}</strong>
          </div>
        );
      })}
      <div className="mt-1 opacity-80 tabular-nums">Total: {total.toLocaleString("pt-BR")} lançamentos</div>
    </div>
  );
}

function RankingTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value?: number | string }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div style={{ ...tooltipStyle, color: "#fff" }} className="px-3 py-2 text-[0.82rem]">
      <strong className="block">{label}</strong>
      <span className="block tabular-nums">{formatCurrency(Number(payload[0]?.value ?? 0))} a descontar</span>
    </div>
  );
}

export default function ReportCharts({ summary, onNavigate }: { summary: PeriodSummary; onNavigate?: (tab: Tab) => void }) {
  const evolution = summary.dailyMatrix.map((day) => ({
    date: day.date,
    label: shortDate(day.date),
    quantity: day.totalQuantity,
    amount: day.amount,
    isWeekend: day.isWeekend
  }));

  const totals = summary.employeeTotals.reduce(
    (acc, row) => ({
      taken: acc.taken + row.taken,
      notTaken: acc.notTaken + row.notTaken,
      pending: acc.pending + row.pending
    }),
    { taken: 0, notTaken: 0, pending: 0 }
  );
  const launched = totals.taken + totals.notTaken + totals.pending;
  const confirmation = [
    { name: "Pegou", value: totals.taken, fill: "var(--color-teal-deep)" },
    { name: "Não pegou", value: totals.notTaken, fill: "var(--color-coral)" },
    { name: "Pendente", value: totals.pending, fill: "var(--color-gold-deep)" }
  ];
  const confirmationTotal = confirmation.reduce((acc, slice) => acc + slice.value, 0);

  const ranking = [...summary.employeeTotals].sort((a, b) => b.amount - a.amount).slice(0, 10);
  const rankingHeight = Math.max(280, ranking.length * 46 + 60);

  const hasMovement = launched > 0 || summary.totalQuantity > 0;

  return (
    <div className="grid grid-cols-1 gap-[18px] max-[520px]:gap-3 xl:grid-cols-5">
      {!hasMovement && onNavigate && (
        <div className="xl:col-span-5">
          <ActionGuide
            targetLabel="Lançamentos"
            hint="Registre refeições no período para ver a evolução aqui."
            onGo={() => onNavigate("records")}
          />
        </div>
      )}
      <Panel className="min-w-0 xl:col-span-3">
        <PanelHeader>
          <div>
            <h2>Evolução diária</h2>
            <p>Consumo (barras) × valor faturado (linha) por dia.</p>
          </div>
        </PanelHeader>
        {evolution.length === 0 ? (
          <EmptyState>Sem dias no período selecionado.</EmptyState>
        ) : (
          <div className="min-h-[280px] w-full min-w-0 overflow-hidden max-[520px]:min-h-[240px]">
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={evolution} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} interval="preserveStartEnd" minTickGap={24} />
                <YAxis yAxisId="qty" allowDecimals={false} tick={{ fontSize: 12 }} width={36} />
                <YAxis
                  yAxisId="amount"
                  orientation="right"
                  tick={{ fontSize: 12 }}
                  width={52}
                  tickFormatter={(value: number) => compactCurrency(Number(value))}
                />
                <Tooltip content={<EvolutionTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="qty" dataKey="quantity" name="Almoços" fill="var(--color-teal)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Line
                  yAxisId="amount"
                  type="monotone"
                  dataKey="amount"
                  name="Valor (R$)"
                  stroke="var(--color-gold-deep)"
                  strokeWidth={2.5}
                  dot={{ r: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>

      <Panel className="min-w-0 xl:col-span-2">
        <PanelHeader>
          <div>
            <h2>Confirmações</h2>
            <p>Pegou × não pegou × pendente no portal.</p>
          </div>
        </PanelHeader>
        {!hasMovement ? (
          <EmptyState>Sem confirmações no período.</EmptyState>
        ) : (
          <div className="w-full min-w-0 overflow-hidden">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={confirmation} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={2}>
                  {confirmation.map((slice) => (
                    <Cell key={slice.name} fill={slice.fill} />
                  ))}
                </Pie>
                <Tooltip content={<ConfirmationTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <ul className="mt-2 grid gap-1 text-[0.85rem]" aria-label="Legenda de confirmações">
              {confirmation.map((slice) => (
                <li key={slice.name} className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden
                      className="inline-block h-3 w-3 shrink-0 rounded-sm"
                      style={{ background: slice.fill }}
                    />
                    <span className="truncate">{slice.name}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-muted">
                    {slice.value.toLocaleString("pt-BR")} ·{" "}
                    {confirmationTotal === 0
                      ? "0%"
                      : `${((slice.value / confirmationTotal) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Panel>

      <Panel className="min-w-0 xl:col-span-5">
        <PanelHeader>
          <div>
            <h2>Ranking de desconto</h2>
            <p>Top 10 colaboradores por valor a descontar.</p>
          </div>
        </PanelHeader>
        {ranking.length === 0 ? (
          <EmptyState>Sem consumo lançado no período.</EmptyState>
        ) : (
          <div className="w-full min-w-0 overflow-hidden" style={{ minHeight: rankingHeight }}>
            <ResponsiveContainer width="100%" height={rankingHeight}>
              <BarChart data={ranking} layout="vertical" margin={{ top: 5, right: 20, left: 8, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
                <XAxis type="number" tickFormatter={(value: number) => compactCurrency(Number(value))} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="employeeName" width={128} tick={{ fontSize: 12 }} />
                <Tooltip content={<RankingTooltip />} />
                <Bar dataKey="amount" name="A descontar" fill="var(--color-teal-deep)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>
    </div>
  );
}
