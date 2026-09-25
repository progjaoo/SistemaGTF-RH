import { Download, Lock, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineActions } from "../../components/ui";
import type { BillingPeriod } from "../../types";

export default function PeriodRowActions({ period, onExport, onClose, onAskReopen }: {
  period: BillingPeriod;
  onExport: (p: BillingPeriod) => void;
  onClose: (p: BillingPeriod) => void;
  onAskReopen: (p: BillingPeriod) => void;
}) {
  const closed = period.status === "CLOSED";
  return (
    <InlineActions>
      <Button type="button" size="icon" title="Exportar Excel" aria-label={`Exportar ${period.label}`} onClick={() => onExport(period)}>
        <Download size={16} />
      </Button>
      {!closed && (
        <Button type="button" variant="outline" size="sm" title={`Fechar ${period.label}`} aria-label={`Fechar ${period.label}`} onClick={() => onClose(period)}>
          <Lock size={15} /> Fechar
        </Button>
      )}
      {closed && (
        <Button type="button" variant="outline" size="icon" title="Reabrir período" aria-label={`Reabrir ${period.label}`} onClick={() => onAskReopen(period)}>
          <Undo2 size={16} />
        </Button>
      )}
    </InlineActions>
  );
}
