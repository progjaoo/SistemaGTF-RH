import DashboardView from "../../components/DashboardView";
import type { DashboardSummary } from "../../types";

export default function DashboardPage({ dashboard }: { dashboard: DashboardSummary | null }) {
  return <DashboardView dashboard={dashboard} />;
}
