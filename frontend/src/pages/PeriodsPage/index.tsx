import { FormEvent, useMemo, useState } from "react";
import { CalendarPlus, Download, Plus, Undo2 } from "lucide-react";
import { Badge, Button, DataTable, EmptyState, Field, FormGrid, InlineActions, Panel, PanelHeader, TwoColumn } from "../../components/ui";
import { api } from "../../api";
import type { BillingPeriod } from "../../types";
import { formatCurrency } from "../../utils/format";
import { buildYearPreview } from "../../utils/periods";

export default function PeriodsPage({
  periods,
  token,
  onSave,
  onClose,
  onReopen,
  onExport,
  onReload
}: {
  periods: BillingPeriod[];
  token: string;
  onSave: (payload: Pick<BillingPeriod, "label" | "startDate" | "endDate">) => Promise<void>;
  onClose: (period: BillingPeriod) => Promise<void>;
  onReopen: (period: BillingPeriod) => Promise<void>;
  onExport: (period: BillingPeriod) => Promise<void>;
  onReload: () => Promise<void>;
}) {
  const [form, setForm] = useState({ label: "", startDate: "", endDate: "" });

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSave(form);
    setForm({ label: "", startDate: "", endDate: "" });
  }

  // --- Gerador anual ---
  const [yearForm, setYearForm] = useState({ year: String(new Date().getFullYear() + 1), cutDay: "6", prefix: "" });
  const [yearBusy, setYearBusy] = useState(false);
  const [yearMessage, setYearMessage] = useState("");

  const yearNum = Number(yearForm.year);
  const cutNum = Number(yearForm.cutDay);
  const yearValid = Number.isInteger(yearNum) && yearNum >= 2000 && yearNum <= 2100;
  const cutValid = Number.isInteger(cutNum) && cutNum >= 1 && cutNum <= 28;
  const yearPreview = yearValid && cutValid ? buildYearPreview(yearNum, cutNum, yearForm.prefix) : [];

  async function submitYear(event: FormEvent) {
    event.preventDefault();
    if (!yearValid || !cutValid) return;
    setYearBusy(true);
    setYearMessage("");
    try {
      const result = await api.bulkYearPeriods(token, {
        year: yearNum,
        cutDay: cutNum,
        labelPrefix: yearForm.prefix.trim() || undefined
      });
      setYearMessage(`${result.periods.length} períodos de ${yearNum} criados.`);
      await onReload();
    } catch (error) {
      // 409 (sobreposição): a API não cria nada; a mensagem orienta conferir a lista.
      const message = error instanceof Error ? error.message : "Não foi possível gerar o ano.";
      setYearMessage(`${message} Confira os períodos existentes na lista ao lado.`);
    } finally {
      setYearBusy(false);
    }
  }

  return (
    <>
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

    <Panel>
      <PanelHeader>
        <div>
          <h2>Gerar ano inteiro</h2>
          <p>Cria os 12 mensais de uma vez (ciclo dia de corte, padrão 06). Se qualquer mês conflitar com período existente, nada é criado. Para visão anual consolidada, crie um período único 01/01–31/12 no formulário acima — atenção: fechar o ano trava o ano todo.</p>
        </div>
      </PanelHeader>
      <FormGrid onSubmit={submitYear}>
        <Field>
          <label>Ano</label>
          <input
            type="number"
            value={yearForm.year}
            min={2000}
            max={2100}
            onChange={(event) => setYearForm({ ...yearForm, year: event.target.value })}
            required
          />
        </Field>
        <Field>
          <label>Dia de corte (1–28)</label>
          <input
            type="number"
            value={yearForm.cutDay}
            min={1}
            max={28}
            onChange={(event) => setYearForm({ ...yearForm, cutDay: event.target.value })}
            required
          />
        </Field>
        <Field>
          <label>Prefixo do rótulo (opcional)</label>
          <input
            value={yearForm.prefix}
            onChange={(event) => setYearForm({ ...yearForm, prefix: event.target.value })}
            placeholder="Ex: GTF"
          />
        </Field>
        <Button type="submit" disabled={yearBusy || !yearValid || !cutValid}>
          <CalendarPlus size={17} />
          {yearBusy ? "Gerando..." : `Gerar ${yearValid ? yearNum : "ano"}`}
        </Button>
      </FormGrid>

      {yearMessage && <EmptyState>{yearMessage}</EmptyState>}

      {yearPreview.length > 0 && (
        <DataTable>
          <thead>
            <tr>
              <th>Prévia — 12 períodos</th>
              <th>Início</th>
              <th>Fim</th>
            </tr>
          </thead>
          <tbody>
            {yearPreview.map((item) => (
              <tr key={item.label}>
                <td>{item.label}</td>
                <td>{item.startDate}</td>
                <td>{item.endDate}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </Panel>
    </>
  );
}
