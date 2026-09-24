import PDFDocument from "pdfkit";
import type { calculatePeriodSummary } from "./calculations.js";

type PeriodSummary = Awaited<ReturnType<typeof calculatePeriodSummary>>;

const brl = (value: number) => `R$ ${value.toFixed(2).replace(".", ",")}`;

// Gera o PDF do relatório a partir do MESMO summary do JSON/XLSX.
// Mesma fonte => mesmos centavos nos três formatos.
export function buildPeriodPdf(summary: PeriodSummary): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(16).fillColor("#111827").text(`Relatório — ${summary.period.label}`);
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor("#6b7280").text(
      `Período: ${summary.period.startDate} a ${summary.period.endDate}  •  Status: ${summary.period.status}`
    );
    doc.moveDown();

    // Colunas: nome | qtd | preços | valor (largura útil A4 ≈ 500pt).
    const x = { name: 48, qty: 330, prices: 390, amount: 470 };
    const row = (name: string, qty: string, prices: string, amount: string, bold: boolean) => {
      if (doc.y > 730) doc.addPage();
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(10).fillColor("#111827");
      doc.text(name, x.name, doc.y, { width: 270 });
      const y = doc.y - 12;
      doc.text(qty, x.qty, y, { width: 50, align: "right" });
      doc.text(prices, x.prices, y, { width: 75 });
      doc.text(amount, x.amount, y, { width: 78, align: "right" });
      doc.moveDown(0.6);
      doc.moveTo(48, doc.y).lineTo(547, doc.y).strokeColor("#e5e7eb").stroke();
      doc.moveDown(0.6);
    };

    row("Funcionário", "Qtd", "Preço(s)", "Valor", true);
    for (const item of summary.employeeTotals) {
      row(
        item.employeeName,
        String(item.quantity),
        item.unitPrices.map((price) => brl(price)).join(", "),
        brl(item.amount),
        false
      );
    }
    doc.moveDown(0.5);
    row("Total geral", String(summary.totalQuantity), "", brl(summary.totalAmount), true);

    doc.end();
  });
}

// Rótulos como "Junho 2026 - 06/06 a 05/07" contêm "/" — inválido em filename.
export function sanitizeReportFilename(label: string) {
  return label.replace(/[/\\?%*:|"<>]/g, "-").trim() || "relatorio";
}
