import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Eye, FileSpreadsheet, FileText, Table2, LayoutGrid } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "../../api";
import { SpreadsheetImport } from "../../components/records/SpreadsheetImport";
import { EmptyState, Field, Panel, PanelHeader } from "../../components/ui";
import ReportKpiCards from "../../components/reports/ReportKpiCards";
import ReportCharts from "../../components/reports/ReportCharts";
import ReportFinancialTable from "../../components/reports/ReportFinancialTable";
import ReportDailyMatrixTable from "../../components/reports/ReportDailyMatrixTable";
import type { BillingPeriod, PeriodSummary } from "../../types";

type Mode = "period" | "range" | "import";
type TableTab = "financial" | "matrix";

const MODES: Array<{ key: Mode; label: string }> = [
  { key: "period", label: "Por período" },
  { key: "range", label: "Por intervalo" },
  { key: "import", label: "Importar" }
];

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
  const [mode, setMode] = useState<Mode>("period");
  const [tableTab, setTableTab] = useState<TableTab>("financial");
  const [busy, setBusy] = useState<"period-xlsx" | "period-pdf" | "period-preview" | "range-xlsx" | "range-pdf" | "range-preview" | null>(null);

  // Prévia instantânea: resumo JSON carregado automaticamente.
  const [summary, setSummary] = useState<PeriodSummary | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const selectedPeriod = periods.find((period) => period.id === (periodId || defaultPeriodId));
  const importPeriod = periods.find((period) => period.id === (importPeriodId || defaultPeriodId));
  const rangeValid = start !== "" && end !== "" && start <= end;

  // Prévia por período: dispara a cada troca de período (padrão = período OPEN atual).
  useEffect(() => {
    if (mode !== "period" || !selectedPeriod) return;
    const requestId = ++requestRef.current;
    setPreviewLoading(true);
    setPreviewError(null);
    api
      .periodReportSummary(token, selectedPeriod.id)
      .then((report) => {
        if (requestRef.current !== requestId) return;
        setSummary(report);
      })
      .catch((error) => {
        if (requestRef.current !== requestId) return;
        const message = error instanceof Error ? error.message : "Não foi possível carregar a prévia.";
        setPreviewError(message);
        setSummary(null);
        toast.error(message);
      })
      .finally(() => {
        if (requestRef.current === requestId) setPreviewLoading(false);
      });
  }, [mode, selectedPeriod, token]);

  // Prévia por intervalo: debounce curto para evitar tempestade de fetches ao digitar datas.
  useEffect(() => {
    if (mode !== "range" || !rangeValid) return;
    const timer = window.setTimeout(() => {
      const requestId = ++requestRef.current;
      setPreviewLoading(true);
      setPreviewError(null);
      api
        .rangeReportSummary(token, { start, end })
        .then((report) => {
          if (requestRef.current !== requestId) return;
          setSummary(report);
        })
        .catch((error) => {
          if (requestRef.current !== requestId) return;
          const message = error instanceof Error ? error.message : "Não foi possível carregar a prévia.";
          setPreviewError(message);
          setSummary(null);
          toast.error(message);
        })
        .finally(() => {
          if (requestRef.current === requestId) setPreviewLoading(false);
        });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [mode, rangeValid, start, end, token]);

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

  const showPreview = mode === "period" || mode === "range";
  const previewScopeLabel =
    mode === "period"
      ? (selectedPeriod?.label ?? "—")
      : rangeValid
        ? `${start} → ${end}`
        : "Informe o intervalo";

  return (
    <div className="grid gap-[18px] max-[520px]:gap-3">
      <Panel>
        <PanelHeader>
          <div>
            <h2>Relatórios</h2>
            <p>Prévia instantânea, exportação e importação da gestora.</p>
          </div>
        </PanelHeader>

        <div
          role="group"
          aria-label="Modo de relatório"
          className="mb-3 flex flex-wrap gap-1 rounded-lg border border-line bg-paper p-1 max-[520px]:grid max-[520px]:grid-cols-3 max-[520px]:gap-1"
        >
          {MODES.map((option) => (
            <button
              key={option.key}
              type="button"
              aria-pressed={mode === option.key}
              onClick={() => setMode(option.key)}
              className={
                mode === option.key
                  ? "min-h-10 flex-1 rounded-md border border-teal-deep bg-teal-bg px-3 text-[0.85rem] font-bold whitespace-nowrap text-teal-deep"
                  : "min-h-10 flex-1 rounded-md border border-transparent px-3 text-[0.85rem] font-bold whitespace-nowrap text-muted hover:text-ink"
              }
            >
              {option.label}
            </button>
          ))}
        </div>

        {mode === "period" && (
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
        )}

        {mode === "range" && (
          <div className="grid gap-3">
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
            <div className="flex flex-wrap gap-2 max-[520px]:[&>button]:flex-[1_1_140px]">
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
          </div>
        )}

        {mode === "import" && (
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
        )}
      </Panel>

      {showPreview && (
        <section aria-label="Prévia instantânea" aria-busy={previewLoading} className="grid gap-[18px] max-[520px]:gap-3">
          <Panel>
            <PanelHeader>
              <div>
                <h2>Prévia instantânea</h2>
                <p>{previewScopeLabel}</p>
              </div>
            </PanelHeader>
            {previewLoading && (
              <div className="grid gap-3" aria-label="Carregando prévia">
                <div className="grid grid-cols-1 gap-[14px] min-[520px]:grid-cols-2 xl:grid-cols-5 max-[520px]:gap-[10px]">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="h-[118px] w-full" />
                  ))}
                </div>
                <Skeleton className="h-[280px] w-full" />
                <Skeleton className="h-[220px] w-full" />
              </div>
            )}
            {!previewLoading && previewError && (
              <EmptyState>{previewError}</EmptyState>
            )}
            {!previewLoading && !previewError && mode === "range" && !rangeValid && (
              <EmptyState>Selecione a data inicial e a data final para ver a prévia do intervalo.</EmptyState>
            )}
            {!previewLoading && !previewError && (mode === "period" || rangeValid) && summary && (
              <div className="grid gap-[18px] max-[520px]:gap-3">
                <ReportKpiCards summary={summary} />
                <ReportCharts summary={summary} />
                <div
                  role="group"
                  aria-label="Visão da tabela"
                  className="flex flex-wrap gap-1 rounded-lg border border-line bg-paper p-1 max-[520px]:grid max-[520px]:grid-cols-2"
                >
                  <button
                    type="button"
                    aria-pressed={tableTab === "financial"}
                    onClick={() => setTableTab("financial")}
                    className={
                      tableTab === "financial"
                        ? "inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-md border border-teal-deep bg-teal-bg px-3 text-[0.85rem] font-bold whitespace-nowrap text-teal-deep"
                        : "inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-md border border-transparent px-3 text-[0.85rem] font-bold whitespace-nowrap text-muted hover:text-ink"
                    }
                  >
                    <LayoutGrid size={15} aria-hidden />
                    Resumo financeiro
                  </button>
                  <button
                    type="button"
                    aria-pressed={tableTab === "matrix"}
                    onClick={() => setTableTab("matrix")}
                    className={
                      tableTab === "matrix"
                        ? "inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-md border border-teal-deep bg-teal-bg px-3 text-[0.85rem] font-bold whitespace-nowrap text-teal-deep"
                        : "inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-md border border-transparent px-3 text-[0.85rem] font-bold whitespace-nowrap text-muted hover:text-ink"
                    }
                  >
                    <Table2 size={15} aria-hidden />
                    Grade diária
                  </button>
                </div>
                {tableTab === "financial" ? (
                  <ReportFinancialTable rows={summary.employeeTotals} />
                ) : (
                  <ReportDailyMatrixTable days={summary.dailyMatrix} employees={summary.employeeTotals} />
                )}
              </div>
            )}
          </Panel>
        </section>
      )}

      {mode === "import" && (
        <Panel>
          <PanelHeader>
            <div>
              <h2>Importar planilha</h2>
              <p>Confira e grave os lançamentos da gestora no período escolhido.</p>
            </div>
          </PanelHeader>
          <p className="text-[0.85rem] text-muted">
            Período alvo: <strong className="text-ink">{importPeriod?.label ?? "—"}</strong>
            {importPeriod?.status === "CLOSED" ? " (fechado — somente consulta)" : ""}
          </p>
        </Panel>
      )}

      {mode === "import" && importPeriod && (
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
