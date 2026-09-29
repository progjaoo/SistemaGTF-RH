import { useMemo, useState } from "react";
import { Download, Eye, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "../../api";
import { SpreadsheetImport } from "../../components/records/SpreadsheetImport";
import { Field, Panel, PanelHeader } from "../../components/ui";
import type { BillingPeriod } from "../../types";

export default function ReportsPage({
  token,
  periods,
  onImported
}: {
  token: string;
  periods: BillingPeriod[];
  onImported: () => Promise<void>;
}) {
  const defaultPeriodId = useMemo(
    () => periods.find((period) => period.status === "OPEN")?.id ?? periods[0]?.id ?? "",
    [periods]
  );
  const [periodId, setPeriodId] = useState(defaultPeriodId);
  const [importPeriodId, setImportPeriodId] = useState(defaultPeriodId);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [busy, setBusy] = useState<"period-xlsx" | "period-pdf" | "period-preview" | "range-xlsx" | "range-pdf" | "range-preview" | null>(null);

  const selectedPeriod = periods.find((period) => period.id === (periodId || defaultPeriodId));
  const importPeriod = periods.find((period) => period.id === (importPeriodId || defaultPeriodId));
  const rangeValid = start !== "" && end !== "" && start <= end;

  async function downloadPeriod(format: "xlsx" | "pdf") {
    if (!selectedPeriod) {
      toast.error("Selecione um período.");
      return;
    }
    setBusy(format === "xlsx" ? "period-xlsx" : "period-pdf");
    try {
      await api.downloadReport(token, selectedPeriod, format);
      toast.success("Relatório do período gerado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível exportar o relatório.");
    } finally {
      setBusy(null);
    }
  }

  async function previewPeriod() {
    if (!selectedPeriod) {
      toast.error("Selecione um período.");
      return;
    }
    setBusy("period-preview");
    try {
      await api.openPeriodPreview(token, selectedPeriod.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível abrir a prévia.");
    } finally {
      setBusy(null);
    }
  }

  async function downloadRange(format: "xlsx" | "pdf") {
    if (!rangeValid) return;
    setBusy(format === "xlsx" ? "range-xlsx" : "range-pdf");
    try {
      await api.downloadRangeReport(token, { start, end, format });
      toast.success("Relatório do intervalo gerado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível gerar o relatório.");
    } finally {
      setBusy(null);
    }
  }

  async function previewRange() {
    if (!rangeValid) return;
    setBusy("range-preview");
    try {
      await api.openRangePreview(token, { start, end });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível abrir a prévia.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-[18px] max-[520px]:gap-3">
      <Panel>
        <PanelHeader>
          <div>
            <h2>Por período</h2>
            <p>Planilha ou PDF de um período de faturamento.</p>
          </div>
        </PanelHeader>
        <div className="grid gap-3">
          <Field>
            <label htmlFor="reports-period">Período</label>
            <select
              id="reports-period"
              value={periodId || defaultPeriodId}
              onChange={(event) => setPeriodId(event.target.value)}
            >
              {periods.map((period) => (
                <option key={period.id} value={period.id}>
                  {period.label} · {period.status === "OPEN" ? "Aberto" : "Fechado"}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex flex-wrap gap-2 max-[520px]:[&>button]:flex-[1_1_140px]">
            <Button type="button" variant="outline" onClick={() => void previewPeriod()} disabled={!selectedPeriod || busy !== null}>
              <Eye size={17} />
              {busy === "period-preview" ? "Abrindo..." : "Prévia"}
            </Button>
            <Button type="button" variant="outline" onClick={() => void downloadPeriod("xlsx")} disabled={!selectedPeriod || busy !== null}>
              <Download size={17} />
              {busy === "period-xlsx" ? "Gerando..." : "Planilha"}
            </Button>
            <Button type="button" variant="outline" onClick={() => void downloadPeriod("pdf")} disabled={!selectedPeriod || busy !== null}>
              <FileText size={17} />
              {busy === "period-pdf" ? "Gerando..." : "PDF"}
            </Button>
          </div>
        </div>
      </Panel>

      <Panel>
        <PanelHeader>
          <div>
            <h2>Por intervalo</h2>
            <p>Planilha ou PDF cruzando períodos, a partir de duas datas.</p>
          </div>
        </PanelHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <label htmlFor="reports-start">Data inicial</label>
            <input id="reports-start" type="date" value={start} onChange={(event) => setStart(event.target.value)} />
          </Field>
          <Field>
            <label htmlFor="reports-end">Data final</label>
            <input id="reports-end" type="date" value={end} onChange={(event) => setEnd(event.target.value)} />
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 max-[520px]:[&>button]:flex-[1_1_140px]">
          <Button type="button" variant="outline" onClick={() => void previewRange()} disabled={!rangeValid || busy !== null}>
            <Eye size={17} />
            {busy === "range-preview" ? "Abrindo..." : "Prévia"}
          </Button>
          <Button type="button" variant="outline" onClick={() => void downloadRange("xlsx")} disabled={!rangeValid || busy !== null}>
            <Download size={17} />
            {busy === "range-xlsx" ? "Gerando..." : "Planilha"}
          </Button>
          <Button type="button" variant="outline" onClick={() => void downloadRange("pdf")} disabled={!rangeValid || busy !== null}>
            <FileText size={17} />
            {busy === "range-pdf" ? "Gerando..." : "PDF"}
          </Button>
        </div>
      </Panel>

      <Panel>
        <PanelHeader>
          <div>
            <h2>Importar planilha</h2>
            <p>Confira e grave os lançamentos da gestora no período escolhido.</p>
          </div>
        </PanelHeader>
        <Field>
          <label htmlFor="reports-import-period">Período</label>
          <select
            id="reports-import-period"
            value={importPeriodId || defaultPeriodId}
            onChange={(event) => setImportPeriodId(event.target.value)}
          >
            {periods.map((period) => (
              <option key={period.id} value={period.id}>
                {period.label} · {period.status === "OPEN" ? "Aberto" : "Fechado"}
              </option>
            ))}
          </select>
        </Field>
      </Panel>

      {importPeriod && (
        <SpreadsheetImport
          key={importPeriod.id}
          token={token}
          periodId={importPeriod.id}
          readOnly={importPeriod.status === "CLOSED"}
          onImported={onImported}
        />
      )}

      <p className="flex items-center gap-2 text-[0.85rem] text-muted">
        <FileSpreadsheet size={15} />
        Períodos fechados ficam somente para consulta na importação.
      </p>
    </div>
  );
}
