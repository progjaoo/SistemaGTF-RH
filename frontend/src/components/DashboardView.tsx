import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { DashboardSummary } from "../types";

const formatCurrency = (value: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value ?? 0);

const shortDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date(`${value}T00:00:00`));

export default function DashboardView({ dashboard }: { dashboard: DashboardSummary | null }) {
  if (!dashboard) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-surface/70 p-7 text-muted">
        Selecione um período para visualizar o dashboard.
      </div>
    );
  }

  const trend = dashboard.current.dailyTrend.map((item) => ({
    ...item,
    label: shortDate(item.date)
  }));

  return (
    <div className="grid gap-[18px] max-[520px]:gap-3">
      <div className="grid grid-cols-3 gap-[14px] max-[800px]:grid-cols-1 max-[520px]:gap-[10px]">
        <KpiCard title="Almoços no período" value={dashboard.current.totalQuantity.toString()} detail={deltaText(dashboard.quantityDelta, "un.")} />
        <KpiCard title="Total a pagar" value={formatCurrency(dashboard.current.totalAmount)} detail={deltaText(dashboard.amountDelta, "R$")} />
        <KpiCard title="Funcionários com consumo" value={dashboard.current.employeeTotals.length.toString()} detail={dashboard.current.period.status === "OPEN" ? "Período aberto" : "Período fechado"} />
      </div>

      <section className="min-w-0 rounded-lg border border-line bg-surface p-[18px] shadow-[0_18px_48px_rgb(32_38_44/0.08)] max-[520px]:p-[14px] max-[520px]:px-[10px]">
        <div className="mb-[14px]">
          <h2 className="m-0 text-[1.05rem]">Evolução diária</h2>
        </div>
        <div className="min-h-[280px] w-full min-w-0 overflow-hidden max-[520px]:min-h-[240px]">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trend} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
              <XAxis dataKey="label" />
              <YAxis allowDecimals={false} />
              <Tooltip
                formatter={(value) => [value, "Almoços"]}
                contentStyle={{ background: "#20262c", color: "#fff", border: "none", borderRadius: 8 }}
              />
              <Line type="monotone" dataKey="quantity" stroke="var(--color-teal)" strokeWidth={3} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="min-w-0 rounded-lg border border-line bg-surface p-[18px] shadow-[0_18px_48px_rgb(32_38_44/0.08)] max-[520px]:p-[14px] max-[520px]:px-[10px]">
        <div className="mb-[14px]">
          <h2 className="m-0 text-[1.05rem]">Ranking de consumo</h2>
        </div>
        <div className="min-h-[280px] w-full min-w-0 overflow-hidden max-[520px]:min-h-[240px]">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={dashboard.current.employeeTotals.slice(0, 8)} layout="vertical" margin={{ top: 5, right: 20, left: 48, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="employeeName" width={92} />
              <Tooltip
                formatter={(value) => [value, "Almoços"]}
                contentStyle={{ background: "#20262c", color: "#fff", border: "none", borderRadius: 8 }}
              />
              <Bar dataKey="quantity" fill="var(--color-teal-deep)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

function KpiCard({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <article className="rounded-lg border border-line border-l-[5px] border-l-teal bg-surface p-[18px] shadow-[0_18px_48px_rgb(32_38_44/0.08)] max-[520px]:p-[14px]">
      <span className="block text-muted">{title}</span>
      <strong className="my-2 block text-[2rem] tracking-normal tabular-nums max-[520px]:text-[1.65rem]">{value}</strong>
      <small className="block text-muted">{detail}</small>
    </article>
  );
}

function deltaText(value: number | null, unit: string) {
  if (value === null) return "Sem período anterior";
  if (unit === "R$") return `${value >= 0 ? "+" : ""}${formatCurrency(value)} vs. anterior`;
  return `${value >= 0 ? "+" : ""}${value} ${unit} vs. anterior`;
}
