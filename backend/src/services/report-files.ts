import ExcelJS from "exceljs";
import type { DailyMatrixCell, calculatePeriodSummary } from "./calculations.js";
import { roundCurrency } from "./calculations.js";

export type PeriodSummary = Awaited<ReturnType<typeof calculatePeriodSummary>>;

// PLAN-012 Task 2: planilha multi-abas espelho da gestora —
// Aba 1 "Fechamento Folha" (resumo financeiro com fórmulas SUM reais),
// Aba 2 "Grade Diária" (matriz Data × Colaborador com fórmulas de linha),
// Aba 3 "Estatísticas" (métricas consolidadas + auditoria).
// Assinatura exportada inalterada: consumida por `billing-periods.ts`
// (report por período) e `reports.ts` (report por intervalo).
export async function buildXlsxBuffer(summary: PeriodSummary): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "GTF Almoço";
  buildFechamentoFolha(workbook, summary);
  buildGradeDiaria(workbook, summary);
  buildEstatisticas(workbook, summary);

  const buffer = await workbook.xlsx.writeBuffer();

  return Buffer.from(buffer);
}

// ---------------------------------------------------------------------------
// Aba 1: "Fechamento Folha"
// ---------------------------------------------------------------------------
function buildFechamentoFolha(workbook: ExcelJS.Workbook, summary: PeriodSummary) {
  const sheet = workbook.addWorksheet("Fechamento Folha");
  const LAST_COL = 6; // A..F
  const employees = [...summary.employeeTotals]
    .sort((a, b) => a.employeeName.localeCompare(b.employeeName, "pt-BR"));

  // Cabeçalho visual Genesis (linhas 1-3): teal #1E8C86, texto branco negrito.
  titleRow(sheet, `A1:${colLetter(LAST_COL)}1`, "GTF Almoço — Fechamento de Folha", 14);
  titleRow(
    sheet,
    `A2:${colLetter(LAST_COL)}2`,
    `Período de apuração: ${summary.period.label} (${brDate(summary.period.startDate)} a ${brDate(summary.period.endDate)}) • Status: ${summary.period.status}`,
    11
  );
  titleRow(
    sheet,
    `A3:${colLetter(LAST_COL)}3`,
    `Gerado em ${nowBr()} • ${employees.length} colaborador(es) • Total faturado: ${brl(summary.totalAmount)} • Total almoços: ${summary.totalQuantity}`,
    11
  );

  // Tabela de descontos: cabeçalho na linha 4, dados a partir da linha 5.
  const HEADER_ROW = 4;
  const DATA_START = 5;
  const headers = [
    "Funcionário",
    "Almoços Faturados",
    "Dias Não Pegou",
    "Dias Pendentes",
    "Preço Unitário",
    "Total a Descontar (R$)"
  ];
  headers.forEach((header, index) => {
    const cell = sheet.getCell(HEADER_ROW, index + 1);
    cell.value = header;
    cell.font = { bold: true, color: { argb: "FF111827" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE6F4F3" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = THIN_BORDER;
  });
  sheet.getRow(HEADER_ROW).height = 30;

  employees.forEach((item, index) => {
    const row = DATA_START + index;
    // E: preço unitário numérico com formato BRL. Com mais de um preço
    // aplicado no período, usa a média ponderada (amount/quantity) para
    // manter a coluna numérica; F carrega o valor exato do resumo.
    const unitDisplay = item.unitPrices.length === 1
      ? item.unitPrices[0]!
      : item.quantity > 0
        ? roundCurrency(item.amount / item.quantity)
        : (item.unitPrices[0] ?? 0);
    setCell(sheet, row, 1, item.employeeName, { horizontal: "left" });
    setCell(sheet, row, 2, item.quantity, { horizontal: "right" });
    setCell(sheet, row, 3, item.notTaken, { horizontal: "right" });
    setCell(sheet, row, 4, item.pending, { horizontal: "right" });
    setCell(sheet, row, 5, unitDisplay, { horizontal: "right", numFmt: BRL_FMT });
    setCell(sheet, row, 6, item.amount, { horizontal: "right", numFmt: BRL_FMT });
  });

  // Rodapé de totais com fórmulas dinâmicas calculadas do layout real.
  const totalRow = DATA_START + employees.length;
  const hasData = employees.length > 0;
  const dataEnd = totalRow - 1;
  setCell(sheet, totalRow, 1, "TOTAL GERAL", { bold: true });
  for (const col of [2, 3, 4, 6]) {
    if (hasData) {
      const cell = sheet.getCell(totalRow, col);
      cell.value = { formula: `SUM(${colLetter(col)}${DATA_START}:${colLetter(col)}${dataEnd})` };
      cell.font = { bold: true };
      cell.alignment = { horizontal: "right", vertical: "middle" };
      cell.border = THIN_BORDER;
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
      if (col === 6) cell.numFmt = BRL_FMT;
    } else {
      setCell(sheet, totalRow, col, 0, { bold: true, horizontal: "right" });
    }
  }
  setCell(sheet, totalRow, 5, "", { bold: true });
  sheet.getCell(totalRow, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };

  sheet.getColumn(1).width = 34;
  sheet.getColumn(2).width = 18;
  sheet.getColumn(3).width = 16;
  sheet.getColumn(4).width = 16;
  sheet.getColumn(5).width = 16;
  sheet.getColumn(6).width = 22;
  sheet.views = [{ state: "frozen", ySplit: HEADER_ROW }];
}

// ---------------------------------------------------------------------------
// Aba 2: "Grade Diária" (matriz Data × Colaborador)
// ---------------------------------------------------------------------------
function buildGradeDiaria(workbook: ExcelJS.Workbook, summary: PeriodSummary) {
  const sheet = workbook.addWorksheet("Grade Diária");
  const employees = [...summary.employeeTotals]
    .sort((a, b) => a.employeeName.localeCompare(b.employeeName, "pt-BR"));
  const days = summary.dailyMatrix;
  // A=Data, B=Dia, C=Total Dia, D..=colaboradores.
  const LAST_COL = 3 + employees.length;

  titleRow(sheet, `A1:${colLetter(LAST_COL)}1`, "GTF - Controle Diário de Almoços por Colaborador", 14);

  const HEADER_ROW = 2;
  const DATA_START = 3;
  const headerLabels = ["Data", "Dia", "Total Dia", ...employees.map((item) => item.employeeName)];
  headerLabels.forEach((header, index) => {
    const cell = sheet.getCell(HEADER_ROW, index + 1);
    cell.value = header;
    cell.font = { bold: true, color: { argb: "FF111827" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE6F4F3" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = THIN_BORDER;
  });

  days.forEach((day, index) => {
    const row = DATA_START + index;
    const weekend = day.isWeekend;
    const rowFill = weekend
      ? { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } } as const
      : undefined;
    const lastColLetter = colLetter(LAST_COL);

    const dateCell = sheet.getCell(row, 1);
    dateCell.value = brDate(day.date);
    dateCell.alignment = { horizontal: "center", vertical: "middle" };
    dateCell.border = THIN_BORDER;
    if (rowFill) dateCell.fill = rowFill;

    const weekdayCell = sheet.getCell(row, 2);
    weekdayCell.value = fullWeekdayLabel(day.weekdayLabel, weekend);
    weekdayCell.font = weekend ? { bold: true } : {};
    weekdayCell.alignment = { horizontal: "center", vertical: "middle" };
    weekdayCell.border = THIN_BORDER;
    if (rowFill) weekdayCell.fill = rowFill;

    // Total do dia: fórmula de soma da linha (colunas dos colaboradores).
    const totalCell = sheet.getCell(row, 3);
    if (employees.length > 0) {
      totalCell.value = { formula: `SUM(D${row}:${lastColLetter}${row})` };
    } else {
      totalCell.value = 0;
    }
    totalCell.font = { bold: true };
    totalCell.alignment = { horizontal: "center", vertical: "middle" };
    totalCell.border = THIN_BORDER;
    if (rowFill) totalCell.fill = rowFill;

    employees.forEach((item, empIndex) => {
      const cell = sheet.getCell(row, 4 + empIndex);
      const display = matrixCellValue(day.entries[item.employeeId]);
      if (display !== null) cell.value = display;
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = THIN_BORDER;
      if (rowFill) cell.fill = rowFill;
    });
  });

  // Rodapé: linha "Total Almoços" com =SUM por coluna.
  const totalRow = DATA_START + days.length;
  const dataEnd = totalRow - 1;
  setFooterLabel(sheet, totalRow, 1, "Total Almoços", 2);
  const grandCell = sheet.getCell(totalRow, 3);
  grandCell.value = { formula: `SUM(C${DATA_START}:C${dataEnd})` };
  styleFooterNumber(grandCell);
  employees.forEach((_item, empIndex) => {
    const col = 4 + empIndex;
    const cell = sheet.getCell(totalRow, col);
    cell.value = { formula: `SUM(${colLetter(col)}${DATA_START}:${colLetter(col)}${dataEnd})` };
    styleFooterNumber(cell);
  });

  sheet.getColumn(1).width = 12;
  sheet.getColumn(2).width = 12;
  sheet.getColumn(3).width = 11;
  employees.forEach((item, empIndex) => {
    sheet.getColumn(4 + empIndex).width = Math.max(12, Math.min(28, item.employeeName.length + 2));
  });
  sheet.views = [{ state: "frozen", ySplit: HEADER_ROW, xSplit: 3 }];
}

// Valor exibido na célula da matriz: quantidade lançada quando há marcação
// (PEGUEI ou PENDENTE), 0 quando confirmou que não pegou, vazio sem lançamento.
function matrixCellValue(cell: DailyMatrixCell | undefined): number | null {
  if (!cell) return null;
  if (cell.confirmationStatus === "NAO_PEGUEI") return 0;
  return cell.quantity;
}

// ---------------------------------------------------------------------------
// Aba 3: "Estatísticas"
// ---------------------------------------------------------------------------
function buildEstatisticas(workbook: ExcelJS.Workbook, summary: PeriodSummary) {
  const sheet = workbook.addWorksheet("Estatísticas");

  titleRow(sheet, "A1:B1", "GTF Almoço — Estatísticas & Auditoria", 14);

  const taken = summary.employeeTotals.reduce((acc, item) => acc + item.taken, 0);
  const notTaken = summary.employeeTotals.reduce((acc, item) => acc + item.notTaken, 0);
  const pending = summary.employeeTotals.reduce((acc, item) => acc + item.pending, 0);
  const launches = taken + notTaken + pending;
  // Taxa de adesão ao portal: % de lançamentos confirmados via sistema.
  const adhesion = launches > 0 ? roundCurrency(((taken + notTaken) / launches) * 100) : 0;
  const avgPrice = summary.totalQuantity > 0
    ? roundCurrency(summary.totalAmount / summary.totalQuantity)
    : 0;
  const withConsumption = summary.employeeTotals.filter((item) => item.quantity > 0).length;

  const rows: Array<{ label: string; value: string | number; numFmt?: string }> = [
    { label: "Período", value: summary.period.label },
    { label: "Apuração (início → fim)", value: `${brDate(summary.period.startDate)} → ${brDate(summary.period.endDate)}` },
    { label: "Dias apurados", value: summary.dailyMatrix.length },
    { label: "Colaboradores com consumo", value: withConsumption },
    { label: "Total de almoços faturados (PEGUEI)", value: summary.totalQuantity },
    { label: "Valor total a descontar (R$)", value: summary.totalAmount, numFmt: BRL_FMT },
    { label: "Preço médio ponderado (R$)", value: avgPrice, numFmt: BRL_FMT },
    { label: "Lançamentos confirmados (PEGUEI + NÃO PEGUEI)", value: taken + notTaken },
    { label: "Taxa de adesão ao portal (%)", value: adhesion, numFmt: '0.00"%"' },
    { label: "Total de pendências (dias)", value: pending }
  ];

  rows.forEach((item, index) => {
    const row = index + 2;
    const labelCell = sheet.getCell(row, 1);
    labelCell.value = item.label;
    labelCell.font = { bold: true };
    labelCell.border = THIN_BORDER;
    const valueCell = sheet.getCell(row, 2);
    valueCell.value = item.value;
    valueCell.alignment = { horizontal: "right", vertical: "middle" };
    valueCell.border = THIN_BORDER;
    if (item.numFmt) valueCell.numFmt = item.numFmt;
  });

  sheet.getColumn(1).width = 46;
  sheet.getColumn(2).width = 26;
}

// ---------------------------------------------------------------------------
// Helpers de formatação
// ---------------------------------------------------------------------------
const BRL_FMT = '"R$"#,##0.00';

const THIN_BORDER: ExcelJS.Borders = {
  top: { style: "thin", color: { argb: "FFD1D5DB" } },
  left: { style: "thin", color: { argb: "FFD1D5DB" } },
  bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
  right: { style: "thin", color: { argb: "FFD1D5DB" } },
  diagonal: {}
};

function colLetter(col: number): string {
  let letter = "";
  let n = col;
  while (n > 0) {
    const mod = (n - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

function titleRow(sheet: ExcelJS.Worksheet, range: string, text: string, size: number) {
  sheet.mergeCells(range);
  const cell = sheet.getCell("A" + range.split(":")[0].replace(/[^0-9]/g, ""));
  cell.value = text;
  cell.font = { bold: true, size, color: { argb: "FFFFFFFF" } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E8C86" } };
  cell.alignment = { horizontal: "left", vertical: "middle" };
}

function setCell(
  sheet: ExcelJS.Worksheet,
  row: number,
  col: number,
  value: string | number,
  opts: { horizontal?: "left" | "right" | "center"; numFmt?: string; bold?: boolean }
) {
  const cell = sheet.getCell(row, col);
  cell.value = value;
  cell.alignment = { horizontal: opts.horizontal ?? "left", vertical: "middle" };
  cell.border = THIN_BORDER;
  if (opts.numFmt) cell.numFmt = opts.numFmt;
  if (opts.bold) cell.font = { bold: true };
}

function setFooterLabel(sheet: ExcelJS.Worksheet, row: number, col: number, text: string, span: number) {
  const end = colLetter(col + span - 1);
  sheet.mergeCells(`${colLetter(col)}${row}:${end}${row}`);
  const cell = sheet.getCell(row, col);
  cell.value = text;
  cell.font = { bold: true };
  cell.border = THIN_BORDER;
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
}

function styleFooterNumber(cell: ExcelJS.Cell) {
  cell.font = { bold: true };
  cell.alignment = { horizontal: "center", vertical: "middle" };
  cell.border = THIN_BORDER;
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
}

const FULL_WEEKDAY_PT: Record<string, string> = {
  Dom: "Domingo",
  Seg: "Segunda",
  Ter: "Terça",
  Qua: "Quarta",
  Qui: "Quinta",
  Sex: "Sexta",
  Sáb: "Sábado"
};

// Dias de semana por extenso; fim de semana em caixa alta (SÁBADO/DOMINGO),
// reproduzindo o destaque das abas mensais da planilha original.
function fullWeekdayLabel(shortLabel: string, weekend: boolean): string {
  const full = FULL_WEEKDAY_PT[shortLabel] ?? shortLabel;
  return weekend ? full.toUpperCase() : full;
}

// "YYYY-MM-DD" -> "DD/MM/YYYY" (texto, sem serial de data do Excel).
function brDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

function brl(value: number): string {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

function nowBr(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function escapeHtml(value: string | number): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Prévia do relatório para conferência em nova aba do navegador —
// MESMOS dados do JSON/XLSX/PDF (regra PEGUEI-only), com botão Imprimir.
export function buildReportHtml(summary: PeriodSummary): string {
  const rows = summary.employeeTotals.map((item) => `
      <tr>
        <td>${escapeHtml(item.employeeName)}</td>
        <td class="num">${item.quantity}</td>
        <td class="num">${item.notTaken}</td>
        <td class="num">${item.pending}</td>
        <td>${escapeHtml(item.unitPrices.map((price) => brl(price)).join(", "))}</td>
        <td class="num">${brl(item.amount)}</td>
      </tr>`).join("");
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Relatório — ${escapeHtml(summary.period.label)}</title>
<style>
body{font-family:system-ui,sans-serif;margin:24px;color:#111827}
h1{font-size:20px;margin:0 0 4px}
p.meta{color:#6b7280;font-size:13px;margin:0 0 16px}
table{border-collapse:collapse;width:100%}
th,td{border:1px solid #d9e0e6;padding:8px 10px;text-align:left;font-size:14px}
th{background:#f3f4f6}
td.num{text-align:right;font-variant-numeric:tabular-nums}
tr.total{font-weight:bold;background:#f3f4f6}
button{margin-bottom:16px;padding:8px 16px;font-size:14px;cursor:pointer}
@media print{button{display:none}}
</style>
</head>
<body>
<button type="button" onclick="window.print()">Imprimir</button>
<h1>Relatório — ${escapeHtml(summary.period.label)}</h1>
<p class="meta">Período: ${escapeHtml(summary.period.startDate)} a ${escapeHtml(summary.period.endDate)} • Status: ${escapeHtml(summary.period.status)}</p>
<table>
<thead><tr><th>Funcionário</th><th>Pegou</th><th>Não pegou</th><th>Pendente</th><th>Preço(s)</th><th>Valor</th></tr></thead>
<tbody>${rows}
<tr class="total"><td>Total geral</td><td class="num">${summary.totalQuantity}</td><td class="num"></td><td class="num"></td><td></td><td class="num">${brl(summary.totalAmount)}</td></tr>
</tbody>
</table>
</body>
</html>`;
}
