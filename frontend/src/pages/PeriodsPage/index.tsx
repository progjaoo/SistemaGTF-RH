import { FormEvent, useState } from "react";
import { Download, Plus, Undo2 } from "lucide-react";
import { Badge, Button, DataTable, Field, FormGrid, InlineActions, Panel, PanelHeader, TwoColumn } from "../../components/ui";
import type { BillingPeriod } from "../../types";
import { formatCurrency } from "../../utils/format";

export default function PeriodsPage({
  periods,
  onSave,
  onClose,
  onReopen,
  onExport
}: {
  periods: BillingPeriod[];
  onSave: (payload: Pick<BillingPeriod, "label" | "startDate" | "endDate">) => Promise<void>;
  onClose: (period: BillingPeriod) => Promise<void>;
  onReopen: (period: BillingPeriod) => Promise<void>;
  onExport: (period: BillingPeriod) => Promise<void>;
}) {
  const [form, setForm] = useState({ label: "", startDate: "", endDate: "" });

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSave(form);
    setForm({ label: "", startDate: "", endDate: "" });
  }

  return (
    <TwoColumn>
      <Panel>
        <PanelHeader>
          <h2>Novo período</h2>
        </PanelHeader>
        <FormGrid onSubmit={submit}>
          <Field>
            <label>Rótulo</label>
            <input value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} required />
          </Field>
          <Field>
            <label>Início</label>
            <input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} required />
          </Field>
          <Field>
            <label>Fim</label>
            <input type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} required />
          </Field>
          <Button type="submit">
            <Plus size={17} />
            Criar
          </Button>
        </FormGrid>
      </Panel>
      <Panel>
        <PanelHeader>
          <h2>Períodos</h2>
        </PanelHeader>
        <DataTable>
          <thead>
            <tr>
              <th>Período</th>
              <th>Status</th>
              <th>Total</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {periods.map((period) => (
              <tr key={period.id}>
                <td>{period.label}</td>
                <td><Badge $tone={period.status === "OPEN" ? "warn" : "good"}>{period.status === "OPEN" ? "Aberto" : "Fechado"}</Badge></td>
                <td>{formatCurrency(period.totalAmount)}</td>
                <td>
                  <InlineActions>
                    <Button type="button" onClick={() => onExport(period)}>
                      <Download size={16} />
                      Excel
                    </Button>
                    <Button type="button" $variant="ghost" disabled={period.status === "CLOSED"} onClick={() => onClose(period)}>
                      Fechar
                    </Button>
                    {period.status === "CLOSED" && (
                      <Button type="button" $variant="ghost" onClick={() => onReopen(period)}>
                        <Undo2 size={16} />
                        Reabrir período
                      </Button>
                    )}
                  </InlineActions>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </Panel>
    </TwoColumn>
  );
}
