import styled from "styled-components";
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
  if (!dashboard) return <EmptyState>Selecione um período para visualizar o dashboard.</EmptyState>;

  const trend = dashboard.current.dailyTrend.map((item) => ({
    ...item,
    label: shortDate(item.date)
  }));

  return (
    <SectionGrid>
      <KpiGrid>
        <KpiCard title="Almoços no período" value={dashboard.current.totalQuantity.toString()} detail={deltaText(dashboard.quantityDelta, "un.")} />
        <KpiCard title="Total a pagar" value={formatCurrency(dashboard.current.totalAmount)} detail={deltaText(dashboard.amountDelta, "R$")} />
        <KpiCard title="Funcionários com consumo" value={dashboard.current.employeeTotals.length.toString()} detail={dashboard.current.period.status === "OPEN" ? "Período aberto" : "Período fechado"} />
      </KpiGrid>

      <Panel>
        <PanelHeader>
          <h2>Evolução diária</h2>
        </PanelHeader>
        <ChartFrame>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trend} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d9e0e6" />
              <XAxis dataKey="label" />
              <YAxis allowDecimals={false} />
              <Tooltip formatter={(value) => [value, "Almoços"]} />
              <Line type="monotone" dataKey="quantity" stroke="#0f766e" strokeWidth={3} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartFrame>
      </Panel>

      <Panel>
        <PanelHeader>
          <h2>Ranking de consumo</h2>
        </PanelHeader>
        <ChartFrame>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={dashboard.current.employeeTotals.slice(0, 8)} layout="vertical" margin={{ top: 5, right: 20, left: 48, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d9e0e6" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="employeeName" width={92} />
              <Tooltip formatter={(value) => [value, "Almoços"]} />
              <Bar dataKey="quantity" fill="#34495e" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
      </Panel>
    </SectionGrid>
  );
}

function KpiCard({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <Kpi>
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </Kpi>
  );
}

function deltaText(value: number | null, unit: string) {
  if (value === null) return "Sem período anterior";
  if (unit === "R$") return `${value >= 0 ? "+" : ""}${formatCurrency(value)} vs. anterior`;
  return `${value >= 0 ? "+" : ""}${value} ${unit} vs. anterior`;
}

const SectionGrid = styled.div`
  display: grid;
  gap: 18px;
`;

const KpiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 800px) {
    grid-template-columns: 1fr;
  }
`;

const Kpi = styled.article`
  padding: 18px;
  border: 1px solid var(--line);
  border-left: 5px solid var(--teal);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow);

  span,
  small {
    display: block;
    color: var(--muted);
  }

  strong {
    display: block;
    margin: 8px 0 6px;
    font-size: 2rem;
    letter-spacing: 0;
  }
`;

const Panel = styled.section`
  min-width: 0;
  padding: 18px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow);
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;

  h2 {
    margin: 0;
    font-size: 1.05rem;
  }
`;

const ChartFrame = styled.div`
  width: 100%;
  min-height: 280px;
`;

const EmptyState = styled.div`
  padding: 28px;
  border: 1px dashed var(--line);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.72);
  color: var(--muted);
`;
