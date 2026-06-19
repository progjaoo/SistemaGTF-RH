import type { BillingPeriod, Employee, MealPrice } from "../types";
import { fullDate, shortDate } from "./date";
import { downloadTextFile } from "./fileDownload";
import { csvValue, formatCurrency, generatedAt, htmlValue, sanitizeFileName } from "./format";
import { resolveMealPrice } from "./mealPricing";

export type MealExportRow = {
  employeeName: string;
  department: string;
  date: string;
  quantity: number;
  unitPrice: number;
  employeeTotalQuantity: number;
  employeeTotalAmount: number;
};

export type MealExportEmployeeSummary = {
  employeeId: string;
  employeeName: string;
  department: string;
  dates: Array<{ date: string; quantity: number }>;
  totalQuantity: number;
  totalAmount: number;
};

export type MealExportSummary = {
  rows: MealExportRow[];
  employees: MealExportEmployeeSummary[];
  totalQuantity: number;
  totalAmount: number;
  usedEmployeeCount: number;
  averagePerEmployee: number;
};

const departmentFallback = "Não informado";

export function buildMealExportSummary({
  employees,
  dates,
  prices,
  quantities
}: {
  employees: Employee[];
  dates: string[];
  prices: MealPrice[];
  quantities: Record<string, number>;
}): MealExportSummary {
  const employeeSummaries = employees.map((employee) => {
    const datesWithLunch: Array<{ date: string; quantity: number }> = [];
    let totalQuantity = 0;
    let totalAmount = 0;

    for (const date of dates) {
      const quantity = quantities[`${employee.id}:${date}`] ?? 0;
      if (quantity <= 0) continue;
      const unitPrice = Number(resolveMealPrice(prices, employee.id, date)?.value ?? 0);
      datesWithLunch.push({ date, quantity });
      totalQuantity += quantity;
      totalAmount += quantity * unitPrice;
    }

    return {
      employeeId: employee.id,
      employeeName: employee.name,
      department: departmentFallback,
      dates: datesWithLunch,
      totalQuantity,
      totalAmount
    };
  });

  const rows = employeeSummaries.flatMap((employee) =>
    employee.dates.map((entry) => {
      const unitPrice = Number(resolveMealPrice(prices, employee.employeeId, entry.date)?.value ?? 0);
      return {
        employeeName: employee.employeeName,
        department: employee.department,
        date: entry.date,
        quantity: entry.quantity,
        unitPrice,
        employeeTotalQuantity: employee.totalQuantity,
        employeeTotalAmount: employee.totalAmount
      };
    })
  );
  const totalQuantity = employeeSummaries.reduce((sum, employee) => sum + employee.totalQuantity, 0);
  const totalAmount = employeeSummaries.reduce((sum, employee) => sum + employee.totalAmount, 0);
  const usedEmployeeCount = employeeSummaries.filter((employee) => employee.totalQuantity > 0).length;

  return {
    rows,
    employees: employeeSummaries,
    totalQuantity,
    totalAmount,
    usedEmployeeCount,
    averagePerEmployee: usedEmployeeCount > 0 ? totalQuantity / usedEmployeeCount : 0
  };
}

export function exportMealSpreadsheet(period: BillingPeriod, exportSummary: MealExportSummary) {
  const header = [
    "Nome do funcionário",
    "Setor/Departamento",
    "Data do lançamento",
    "Quantidade",
    "Valor do almoço",
    "Total de almoços no período por pessoa",
    "Valor total do funcionário"
  ];
  const lines = [
    header.map(csvValue).join(";"),
    ...exportSummary.rows.map((row) =>
      [
        row.employeeName,
        row.department,
        fullDate(row.date),
        row.quantity,
        formatCurrency(row.unitPrice),
        row.employeeTotalQuantity,
        formatCurrency(row.employeeTotalAmount)
      ]
        .map(csvValue)
        .join(";")
    ),
    "",
    ["Totais gerais", "", "", exportSummary.totalQuantity, formatCurrency(exportSummary.totalAmount), "", ""].map(csvValue).join(";"),
    ["Funcionários que utilizaram", exportSummary.usedEmployeeCount, "", "", "", "", ""].map(csvValue).join(";"),
    ["Média de almoços por funcionário", exportSummary.averagePerEmployee.toFixed(2).replace(".", ","), "", "", "", "", ""].map(csvValue).join(";")
  ];

  downloadTextFile(
    `almocos-${sanitizeFileName(period.label)}-${period.startDate}-${period.endDate}.csv`,
    `\ufeff${lines.join("\n")}`,
    "text/csv;charset=utf-8"
  );
}

export function exportMealConferencePdf(period: BillingPeriod, exportSummary: MealExportSummary) {
  const reportWindow = window.open("", "_blank");
  if (!reportWindow) {
    window.alert("Não foi possível abrir o relatório. Verifique o bloqueador de pop-ups do navegador.");
    return;
  }

  const topEmployees = exportSummary.employees.filter((employee) => employee.totalQuantity > 0).slice(0, 10);
  const maxQuantity = Math.max(...topEmployees.map((employee) => employee.totalQuantity), 1);
  const employeeRows = exportSummary.employees
    .map((employee) => {
      const datesLabel = employee.dates.length
        ? employee.dates.map((entry) => `${shortDate(entry.date)}${entry.quantity > 1 ? ` (${entry.quantity})` : ""}`).join(", ")
        : "-";

      return `<tr>
          <td>${htmlValue(employee.employeeName)}</td>
          <td>${htmlValue(employee.department)}</td>
          <td>${htmlValue(datesLabel)}</td>
          <td class="number">${employee.totalQuantity}</td>
          <td class="number">${htmlValue(formatCurrency(employee.totalAmount))}</td>
        </tr>`;
    })
    .join("");
  const chartRows = topEmployees
    .map((employee) => {
      const width = Math.max(6, Math.round((employee.totalQuantity / maxQuantity) * 100));
      return `<div class="bar-row">
          <span>${htmlValue(employee.employeeName)}</span>
          <div class="bar-track"><div class="bar" style="width:${width}%"></div></div>
          <strong>${employee.totalQuantity}</strong>
        </div>`;
    })
    .join("");

  reportWindow.document.write(`<!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>Relatório de Almoços - ${htmlValue(period.label)}</title>
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; padding: 28px; color: #20262c; font-family: Arial, sans-serif; background: #fff; }
            header { display: flex; justify-content: space-between; gap: 18px; align-items: flex-start; border-bottom: 3px solid #178f5b; padding-bottom: 16px; margin-bottom: 18px; }
            h1 { margin: 4px 0; font-size: 28px; letter-spacing: 0; }
            h2 { margin: 26px 0 12px; font-size: 18px; }
            .muted { color: #667085; font-size: 13px; }
            .company { color: #178f5b; font-weight: 800; text-transform: uppercase; }
            .summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin: 18px 0; }
            .metric { border: 1px solid #dde3e8; border-radius: 8px; padding: 12px; background: #f7faf8; break-inside: avoid; }
            .metric span { display: block; color: #667085; font-size: 12px; margin-bottom: 6px; }
            .metric strong { font-size: 20px; }
            table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            th, td { border-bottom: 1px solid #dde3e8; padding: 9px 8px; text-align: left; vertical-align: top; font-size: 12px; }
            th { background: #f1f5f3; font-weight: 800; }
            .number { text-align: right; white-space: nowrap; }
            .chart { display: grid; gap: 8px; margin-bottom: 18px; }
            .bar-row { display: grid; grid-template-columns: 180px 1fr 42px; gap: 10px; align-items: center; font-size: 12px; break-inside: avoid; }
            .bar-track { height: 14px; border-radius: 999px; background: #e7ece9; overflow: hidden; }
            .bar { height: 100%; background: #178f5b; }
            @media print {
              body { padding: 18mm; }
              button { display: none; }
              .summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            }
          </style>
        </head>
        <body>
          <header>
            <div>
              <div class="company">Grupo GTF</div>
              <h1>Relatório de Almoços</h1>
              <div class="muted">Período: ${htmlValue(fullDate(period.startDate))} a ${htmlValue(fullDate(period.endDate))}</div>
            </div>
            <div class="muted">Gerado em ${htmlValue(generatedAt())}</div>
          </header>

          <section class="summary" aria-label="Resumo executivo">
            <div class="metric"><span>Total de almoços</span><strong>${exportSummary.totalQuantity}</strong></div>
            <div class="metric"><span>Valor total gasto</span><strong>${htmlValue(formatCurrency(exportSummary.totalAmount))}</strong></div>
            <div class="metric"><span>Funcionários atendidos</span><strong>${exportSummary.usedEmployeeCount}</strong></div>
            <div class="metric"><span>Média por funcionário</span><strong>${exportSummary.averagePerEmployee.toFixed(1).replace(".", ",")}</strong></div>
          </section>

          ${chartRows ? `<h2>Maiores consumos no período</h2><section class="chart">${chartRows}</section>` : ""}

          <h2>Detalhamento por funcionário</h2>
          <table>
            <thead>
              <tr>
                <th>Funcionário</th>
                <th>Setor/Departamento</th>
                <th>Dias com almoço</th>
                <th class="number">Total</th>
                <th class="number">Valor total</th>
              </tr>
            </thead>
            <tbody>${employeeRows}</tbody>
          </table>
        </body>
      </html>`);
  reportWindow.document.close();
  reportWindow.focus();
  window.setTimeout(() => reportWindow.print(), 300);
}
