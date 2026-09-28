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
