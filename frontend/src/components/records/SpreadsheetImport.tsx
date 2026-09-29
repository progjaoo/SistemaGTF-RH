import { useState } from "react";
import { CheckCircle2, FileSpreadsheet, Upload, XCircle } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ImportPreviewRow } from "../../types";
import { parseSpreadsheetFile, type SheetRow } from "../../utils/spreadsheet";
import { DataTable, EmptyState, Panel, PanelHeader } from "../ui";

export function SpreadsheetImport({
  token,
  periodId,
  readOnly,
  onImported
}: {
  token: string;
  periodId: string;
  readOnly: boolean;
  onImported: () => Promise<void>;
}) {
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<SheetRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [preview, setPreview] = useState<ImportPreviewRow[]>([]);
  const [valid, setValid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setFileName(file.name);
    setPreview([]);
    setValid(false);
    setMessage("");
    setError("");
    const parsed = await parseSpreadsheetFile(file);
    setRows(parsed.rows);
    setParseErrors(parsed.errors);
  }

  async function confer() {
    if (rows.length === 0) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await api.importMealRecords(token, periodId, rows, true);
      setPreview(result.preview);
      setValid(result.valid);
      if (!result.valid) {
        setError(`${result.invalidCount} linha(s) com problema. Corrija a planilha e confira de novo — nada foi gravado.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível conferir a planilha.");
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!valid || readOnly) return;
    setBusy(true);
    setError("");
    try {
      const result = await api.importMealRecords(token, periodId, rows, false);
      setMessage(`${result.records.length} lançamento(s) importados.`);
      toast.success(`${result.records.length} lançamento(s) importados.`);
      setRows([]);
      setPreview([]);
      setValid(false);
      setFileName("");
      await onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível importar a planilha.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel>
      <PanelHeader>
        <div>
          <h2>Importar planilha da gestora</h2>
          <p>Arquivo .xlsx/.xls/.csv com colunas Nome, Data e Quantidade. Nada é gravado antes da conferência.</p>
        </div>
      </PanelHeader>

      <div className="grid gap-2 [&>label]:text-[0.86rem] [&>label]:font-extrabold [&>input[type=file]]:min-h-11 [&>span]:text-[0.86rem] [&>span]:font-bold [&>span]:text-muted">
        <label htmlFor="spreadsheet-file">Arquivo</label>
        <input
          id="spreadsheet-file"
          type="file"
          accept=".xlsx,.xls,.csv"
          disabled={readOnly || busy}
          onChange={(event) => void handleFile(event.target.files?.[0])}
        />
        {fileName && <span>{fileName} · {rows.length} linha(s) lidas</span>}
      </div>

      {parseErrors.length > 0 && (
        <ul className="grid list-disc gap-[6px] rounded-lg border border-danger/30 bg-danger/5 py-3 pl-8 pr-3 text-[0.88rem] font-bold text-danger-ink">
          {parseErrors.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}

      {rows.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => void confer()} disabled={busy || readOnly}>
            <FileSpreadsheet size={17} />
            {busy ? "Conferindo..." : "Conferir antes de gravar"}
          </Button>
          <Button type="button" onClick={() => void confirm()} disabled={busy || readOnly || !valid}>
            <Upload size={17} />
            Confirmar importação
          </Button>
        </div>
      )}

      {error && <EmptyState>{error}</EmptyState>}
      {message && <p className="flex items-center gap-2 font-extrabold text-teal-deep"><CheckCircle2 size={18} /> {message}</p>}

      {preview.length > 0 && (
        <DataTable>
          <thead>
            <tr>
              <th>#</th>
              <th>Nome na planilha</th>
              <th>Funcionário</th>
              <th>Data</th>
              <th>Qtd.</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {preview.map((row) => (
              <tr key={row.index}>
                <td>{row.index}</td>
                <td>{row.name}</td>
                <td>{row.employeeName ?? "—"}</td>
                <td>{row.date}</td>
                <td>{row.quantity}</td>
                <td>
                  {row.status === "ok" ? (
                    <Badge variant="good">OK</Badge>
                  ) : (
                    <Badge variant="warn" title={row.message}>
                      <XCircle size={14} /> Erro
                    </Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
      {preview.some((row) => row.status === "error") && (
        <ul className="grid list-disc gap-[6px] rounded-lg border border-danger/30 bg-danger/5 py-3 pl-8 pr-3 text-[0.88rem] font-bold text-danger-ink">
          {preview.filter((row) => row.status === "error").map((row) => (
            <li key={row.index}>Linha {row.index}: {row.message}</li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
