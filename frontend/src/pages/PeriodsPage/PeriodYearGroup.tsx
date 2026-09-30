import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "../../components/ui";
import { formatCurrency } from "../../utils/format";
import type { BillingPeriod } from "../../types";
import PeriodRowActions from "./PeriodRowActions";

export default function PeriodYearGroup({ year, periods, openCount, defaultOpen, onExport, onClose, onAskReopen, onAskDelete }: {
  year: string; periods: BillingPeriod[]; openCount: number; defaultOpen: boolean;
  onExport: (p: BillingPeriod) => void; onClose: (p: BillingPeriod) => void; onAskReopen: (p: BillingPeriod) => void; onAskDelete: (p: BillingPeriod) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  useEffect(() => { setOpen(defaultOpen); }, [defaultOpen]);
  return (
    <div className="rounded-lg border border-line">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full min-w-0 items-center justify-between gap-3 px-4 py-3 text-left">
        <span className="flex min-w-0 flex-wrap items-center gap-2 font-bold">{year}
          <Badge variant={openCount > 0 ? "warn" : "good"}>{openCount > 0 ? `${openCount} aberto(s)` : "tudo fechado"}</Badge>
          <span className="text-sm font-normal text-muted">{periods.length} períodos</span>
        </span>
        <ChevronDown size={18} className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <DataTable>
          <thead><tr><th>Período</th><th>Status</th><th style={{ textAlign: "right" }}>Total</th><th>Ações</th></tr></thead>
          <tbody>
            {periods.map((p) => (
              <tr key={p.id}>
                <td><div className="font-medium">{p.label}</div><div className="text-xs text-muted">{p.startDate} → {p.endDate}</div></td>
                <td><Badge variant={p.status === "OPEN" ? "warn" : "good"}>{p.status === "OPEN" ? "Aberto" : "Fechado"}</Badge></td>
                <td style={{ textAlign: "right" }}>{formatCurrency(p.totalAmount)}</td>
                <td><PeriodRowActions period={p} onExport={onExport} onClose={onClose} onAskReopen={onAskReopen} onAskDelete={onAskDelete} /></td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </div>
  );
}
