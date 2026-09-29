import ExcelJS from "exceljs";
import type { calculatePeriodSummary } from "./calculations.js";

export type PeriodSummary = Awaited<ReturnType<typeof calculatePeriodSummary>>;

// Planilha do relatório — byte por byte o mesmo layout usado antes inline
// em `billing-periods.ts` (agora reutilizado pelo report por período e pelo
// report por intervalo `GET /api/reports`).
export async function buildXlsxBuffer(summary: PeriodSummary): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Relatorio");

  sheet.columns = [
    { header: "Funcionario", key: "employeeName", width: 30 },
    { header: "Quantidade (pegou)", key: "quantity", width: 18 },
    { header: "Não pegou (dias)", key: "notTaken", width: 16 },
    { header: "Pendente (dias)", key: "pending", width: 16 },
    { header: "Preco(s) aplicado(s)", key: "unitPrices", width: 22 },
    { header: "Valor a descontar", key: "amount", width: 20 }
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.addRows(summary.employeeTotals.map((item) => ({
    employeeName: item.employeeName,
    quantity: item.quantity,
    notTaken: item.notTaken,
    pending: item.pending,
    unitPrices: item.unitPrices.map((price) => `R$ ${price.toFixed(2)}`).join(", "),
    amount: item.amount
  })));
  sheet.addRow({});
  sheet.addRow({ employeeName: "Total geral", quantity: summary.totalQuantity, amount: summary.totalAmount });
  sheet.getColumn("amount").numFmt = '"R$"#,##0.00';

  const buffer = await workbook.xlsx.writeBuffer();

  return Buffer.from(buffer);
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
  const brl = (value: number) => `R$ ${value.toFixed(2).replace(".", ",")}`;
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
