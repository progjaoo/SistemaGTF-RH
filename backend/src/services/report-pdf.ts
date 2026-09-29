import PDFDocument from "pdfkit";
import type { calculatePeriodSummary } from "./calculations.js";

type PeriodSummary = Awaited<ReturnType<typeof calculatePeriodSummary>>;

const brl = (value: number) => `R$ ${value.toFixed(2).replace(".", ",")}`;

// Espelho visual do cabeçalho teal do XLSX (report-files.ts), sem nova
// regra de cálculo: mesmos dados do summary do JSON/XLSX.
const TEAL = "#1E8C86";
const TEAL_PALE = "#E6F4F3";
const TOTAL_FILL = "#F3F4F6";
const INK = "#111827";
const MUTED = "#6b7280";
const RULE = "#e5e7eb";
const PAGE_LEFT = 48;
const PAGE_RIGHT = 547;
const CONTENT_WIDTH = PAGE_RIGHT - PAGE_LEFT; // 499

// Gera o PDF do relatório a partir do MESMO summary do JSON/XLSX.
// Mesma fonte => mesmos centavos nos três formatos.
// compress:false — texto em claro no content stream: permite asserts
// estruturais de conteúdo nos testes sem nova dependência (pdfkit escreve
// fragmentos hexadecimais; ver pdfTextOf em tests/helpers.ts).
export function buildPeriodPdf(summary: PeriodSummary): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48, compress: false });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Ordem de apresentação = XLSX (Fechamento Folha ordena por nome pt-BR).
    const employees = [...summary.employeeTotals].sort((a, b) =>
      a.employeeName.localeCompare(b.employeeName, "pt-BR")
    );

    // Faixa de identidade Genesis (espelho das linhas 1-3 do XLSX).
    const bandY = doc.y;
    doc.rect(PAGE_LEFT, bandY, CONTENT_WIDTH, 54).fill(TEAL);
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(14)
      .text("GTF Almoço — Fechamento de Folha", PAGE_LEFT + 10, bandY + 8, { width: CONTENT_WIDTH - 20 });
    doc.font("Helvetica").fontSize(9)
      .text(
        `Período de apuração: ${summary.period.label} (${brDate(summary.period.startDate)} a ${brDate(summary.period.endDate)}) • Status: ${summary.period.status}`,
        PAGE_LEFT + 10, bandY + 30, { width: CONTENT_WIDTH - 20 }
      );
    doc.y = bandY + 62;
    doc.fontSize(9).fillColor(MUTED).text(
      `Gerado em ${nowBr()} • ${employees.length} colaborador(es) • Total faturado: ${brl(summary.totalAmount)} • Total almoços: ${summary.totalQuantity}`
    );
    doc.moveDown();

    // Colunas mensais RH: nome | dias (pegou) | preço unit. (médio) |
    // qtd | não pegou | total (largura útil A4 ≈ 500pt).
    const x = { name: 48, days: 184, unit: 320, qty: 384, notTaken: 422, amount: 487 };
    const row = (name: string, days: string, unit: string, qty: string, notTaken: string, amount: string, bold: boolean, fill?: string) => {
      if (doc.y > 730) doc.addPage();
      const h = Math.max(
        doc.heightOfString(name, { width: 132 }),
        doc.heightOfString(days, { width: 128 }),
        12
      ) + 8;
      if (fill) doc.rect(PAGE_LEFT, doc.y - 4, CONTENT_WIDTH, h).fill(fill);
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(10).fillColor(INK);
      doc.text(name, x.name, doc.y, { width: 132 });
      const y = doc.y - 12;
      doc.text(days, x.days, y, { width: 128 });
      doc.text(unit, x.unit, y, { width: 56, align: "right" });
      doc.text(qty, x.qty, y, { width: 34, align: "right" });
      doc.text(notTaken, x.notTaken, y, { width: 56 });
      doc.text(amount, x.amount, y, { width: 60, align: "right" });
      doc.moveDown(0.6);
      doc.moveTo(PAGE_LEFT, doc.y).lineTo(PAGE_RIGHT, doc.y).strokeColor(RULE).stroke();
      doc.moveDown(0.6);
    };

    const daysList = (dates: string[]) => dates.map((iso) => {
      const [, month, day] = iso.split("-");
      return month && day ? `${day}/${month}` : iso;
    }).join(", ");

    row("Funcionário", "Dias", "Preço Unit.", "Qtd", "Não Pegou", "Total", true, TEAL_PALE);
    for (const item of employees) {
      const unitDisplay = item.unitPrices.length === 1
        ? item.unitPrices[0]!
        : item.quantity > 0
          ? Math.round((item.amount / item.quantity) * 100) / 100
          : (item.unitPrices[0] ?? 0);
      row(
        item.employeeName,
        daysList(item.takenDates),
        brl(unitDisplay),
        String(item.quantity),
        daysList(item.notTakenDates),
        brl(item.amount),
        false
      );
    }
    doc.moveDown(0.5);
    row("Total geral", "", "", String(summary.totalQuantity), "", brl(summary.totalAmount), true, TOTAL_FILL);

    doc.end();
  });
}

// Rótulos como "Junho 2026 - 06/06 a 05/07" contêm "/" — inválido em filename.
export function sanitizeReportFilename(label: string) {
  return label.replace(/[/\\?%*:|"<>]/g, "-").trim() || "relatorio";
}

// "YYYY-MM-DD" -> "DD/MM/YYYY" (espelho do XLSX).
function brDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

function nowBr(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}
