import { useState } from "react";
import { CheckCircle2, FileSpreadsheet, Upload, XCircle } from "lucide-react";
import styled from "styled-components";
import { api } from "../../api";
import type { ImportPreviewRow } from "../../types";
import { parseSpreadsheetFile, type SheetRow } from "../../utils/spreadsheet";
import { Badge, Button, DataTable, EmptyState, Panel, PanelHeader } from "../ui";

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

      <ImportGrid>
        <label htmlFor="spreadsheet-file">Arquivo</label>
        <input
          id="spreadsheet-file"
          type="file"
          accept=".xlsx,.xls,.csv"
          disabled={readOnly || busy}
          onChange={(event) => void handleFile(event.target.files?.[0])}
        />
        {fileName && <span>{fileName} · {rows.length} linha(s) lidas</span>}
      </ImportGrid>

      {parseErrors.length > 0 && (
        <ErrorList>
          {parseErrors.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ErrorList>
      )}

      {rows.length > 0 && (
        <ImportActions>
          <Button type="button" onClick={() => void confer()} disabled={busy || readOnly}>
            <FileSpreadsheet size={17} />
            {busy ? "Conferindo..." : "Conferir antes de gravar"}
          </Button>
          <Button type="button" onClick={() => void confirm()} disabled={busy || readOnly || !valid}>
            <Upload size={17} />
            Confirmar importação
          </Button>
        </ImportActions>
      )}

      {error && <EmptyState>{error}</EmptyState>}
      {message && <SuccessLine><CheckCircle2 size={18} /> {message}</SuccessLine>}

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
                    <Badge $tone="good">OK</Badge>
                  ) : (
                    <Badge $tone="warn" title={row.message}>
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
        <ErrorList>
          {preview.filter((row) => row.status === "error").map((row) => (
            <li key={row.index}>Linha {row.index}: {row.message}</li>
          ))}
        </ErrorList>
      )}
    </Panel>
  );
}

const ImportGrid = styled.div`
  display: grid;
  gap: 8px;

  label {
    font-weight: 800;
    font-size: 0.86rem;
  }

  input[type="file"] {
    min-height: 44px;
  }

  span {
    color: var(--muted);
    font-size: 0.86rem;
    font-weight: 700;
  }
`;

const ImportActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const ErrorList = styled.ul`
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 12px 12px 12px 32px;
  border: 1px solid #fecaca;
  border-radius: 8px;
  background: #fff1f2;
  color: #b91c1c;
  font-size: 0.88rem;
  font-weight: 700;
`;

const SuccessLine = styled.p`
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--teal);
  font-weight: 800;
`;
