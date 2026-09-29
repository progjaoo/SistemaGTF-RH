import express from "express";
import { z } from "zod";
import { parseDate } from "../lib/dates.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.js";
import { calculateRangeSummary } from "../services/calculations.js";
import { buildReportHtml, buildXlsxBuffer } from "../services/report-files.js";
import { buildPeriodPdf } from "../services/report-pdf.js";

export const reportsRouter = express.Router();

reportsRouter.use(authenticate);

const DAY_MS = 24 * 60 * 60 * 1000;
// Assunção do plano: intervalo máximo de 366 dias (422 acima).
const MAX_RANGE_DAYS = 366;

// Relatório por intervalo arbitrário (cruza períodos) em JSON/XLSX/PDF,
// derivado do MESMO cálculo do report por período (regra PEGUEI-only).
reportsRouter.get("/", asyncHandler(async (req, res) => {
  const input = z.object({
    start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    format: z.enum(["json", "xlsx", "pdf", "html"]).optional().default("json")
  }).parse(req.query);

  const start = parseDate(input.start);
  const end = parseDate(input.end);

  if (start > end) {
    return res.status(422).json({ message: "Data inicial deve ser anterior à final." });
  }

  if (Math.round((end.getTime() - start.getTime()) / DAY_MS) > MAX_RANGE_DAYS) {
    return res.status(422).json({ message: "Intervalo máximo de 366 dias." });
  }

  const summary = await calculateRangeSummary(start, end);
  const slug = `${input.start.replaceAll("-", "")}_a_${input.end.replaceAll("-", "")}`;

  if (input.format === "pdf") {
    const buffer = await buildPeriodPdf(summary);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="relatorio_${slug}.pdf"`);
    return res.send(buffer);
  }

  if (input.format === "html") {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(buildReportHtml(summary));
  }

  if (input.format === "xlsx") {
    const buffer = await buildXlsxBuffer(summary);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="relatorio_${slug}.xlsx"`);
    return res.send(buffer);
  }

  return res.json({ report: summary });
}));
