import ExcelJS from "exceljs";
import { BillingStatus, Role } from "@prisma/client";
import express from "express";
import { z } from "zod";
import { formatDate, parseDate } from "../lib/dates.js";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { calculatePeriodSummary, serializePeriod } from "../services/calculations.js";
import { sanitizeReportFilename, buildPeriodPdf } from "../services/report-pdf.js";

export const billingPeriodsRouter = express.Router();

billingPeriodsRouter.use(authenticate);

const periodSchema = z.object({
  label: z.string().min(3),
  startDate: z.string(),
  endDate: z.string()
});

const MONTH_NAMES_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const pad2 = (value: number) => String(value).padStart(2, "0");

// Gera os 12 mensais de um ano seguindo o dia de corte:
// mês M = cutDay/M/ano → (cutDay-1)/(M+1); dezembro avança o ano.
// Corte dia 1 = mês cheio (01/M → último dia de M).
export function buildYearPeriods(year: number, cutDay: number, labelPrefix?: string) {
  return MONTH_NAMES_PT.map((monthName, index) => {
    const month = index + 1;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const endDay = cutDay - 1;
    const startDate = `${year}-${pad2(month)}-${pad2(cutDay)}`;
    const endDate = endDay >= 1
      ? `${nextYear}-${pad2(nextMonth)}-${pad2(endDay)}`
      : `${year}-${pad2(month)}-${pad2(new Date(year, month, 0).getDate())}`;
    const prefix = labelPrefix?.trim() ? `${labelPrefix.trim()} ` : "";
    const endLabel = endDay >= 1 ? `${pad2(endDay)}/${pad2(nextMonth)}` : `${pad2(new Date(year, month, 0).getDate())}/${pad2(month)}`;
    return {
      label: `${prefix}${monthName} ${year} - ${pad2(cutDay)}/${pad2(month)} a ${endLabel}`,
      startDate,
      endDate
    };
  });
}

billingPeriodsRouter.get("/", asyncHandler(async (_req, res) => {
  const periods = await prisma.billingPeriod.findMany({
    orderBy: [{ startDate: "desc" }]
  });

  res.json({ periods: periods.map(serializePeriod) });
}));

billingPeriodsRouter.post("/", requireRole(Role.RH), asyncHandler(async (req, res) => {
  const actor = (req as AuthenticatedRequest).user;
  const input = periodSchema.parse(req.body);
  const startDate = parseDate(input.startDate);
  const endDate = parseDate(input.endDate);

  if (startDate > endDate) {
    return res.status(422).json({ message: "A data inicial deve ser anterior a data final." });
  }

  const period = await prisma.billingPeriod.create({
    data: {
      label: input.label,
      startDate,
      endDate
    }
  });

  await prisma.auditLog.create({
    data: { actorId: actor.id, entity: "BillingPeriod", entityId: period.id, action: "CREATE_PERIOD" }
  });

  res.status(201).json({ period: serializePeriod(period) });
}));

const bulkYearSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  cutDay: z.coerce.number().int().min(1).max(28),
  labelPrefix: z.string().trim().max(40).optional()
});

// Gera os 12 períodos mensais de um ano de uma vez (RH).
// Atômico: qualquer sobreposição com período existente aborta tudo (409)
// listando os conflitos — nada é criado.
billingPeriodsRouter.post("/bulk-year", requireRole(Role.RH), asyncHandler(async (req, res) => {
  const actor = (req as AuthenticatedRequest).user;
  const input = bulkYearSchema.parse(req.body);
  const planned = buildYearPeriods(input.year, input.cutDay, input.labelPrefix);

  const existing = await prisma.billingPeriod.findMany({
    orderBy: [{ startDate: "asc" }]
  });
  const conflicts: Array<{ label: string; conflictsWith: string[] }> = [];
  for (const item of planned) {
    const clashes = existing
      .filter((period) =>
        formatDate(period.startDate) <= item.endDate && formatDate(period.endDate) >= item.startDate
      )
      .map((period) => period.label);
    if (clashes.length > 0) conflicts.push({ label: item.label, conflictsWith: clashes });
  }
  if (conflicts.length > 0) {
    return res.status(409).json({
      message: "Alguns períodos do ano conflitam com períodos existentes. Nada foi criado.",
      conflicts
    });
  }

  const created = await prisma.$transaction(
    planned.map((item) =>
      prisma.billingPeriod.create({
        data: {
          label: item.label,
          startDate: parseDate(item.startDate),
          endDate: parseDate(item.endDate)
        }
      })
    )
  );

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      entity: "BillingPeriod",
      action: "BULK_CREATE_YEAR",
      metadata: { year: input.year, cutDay: input.cutDay, count: created.length }
    }
  });

  res.status(201).json({ periods: created.map(serializePeriod) });
}));

billingPeriodsRouter.post("/:id/close", requireRole(Role.RH), asyncHandler(async (req, res) => {
  const actor = (req as AuthenticatedRequest).user;
  const period = await prisma.billingPeriod.findUnique({ where: { id: req.params.id } });

  if (!period) {
    return res.status(404).json({ message: "Periodo nao encontrado." });
  }

  if (period.status === BillingStatus.CLOSED) {
    return res.status(409).json({ message: "Periodo ja esta fechado." });
  }

  const summary = await calculatePeriodSummary(period.id);
  const closed = await prisma.billingPeriod.update({
    where: { id: period.id },
    data: {
      status: BillingStatus.CLOSED,
      closedAt: new Date(),
      closedById: actor.id,
      totalAmount: summary.totalAmount
    }
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      entity: "BillingPeriod",
      entityId: period.id,
      action: "CLOSE_PERIOD",
      metadata: { totalAmount: summary.totalAmount, totalQuantity: summary.totalQuantity }
    }
  });

  res.json({ period: serializePeriod(closed), summary });
}));

billingPeriodsRouter.post("/:id/reopen", requireRole(Role.RH), asyncHandler(async (req, res) => {
  const actor = (req as AuthenticatedRequest).user;
  const period = await prisma.billingPeriod.findUnique({ where: { id: req.params.id } });

  if (!period) {
    return res.status(404).json({ message: "Periodo nao encontrado." });
  }

  if (period.status === BillingStatus.OPEN) {
    return res.status(409).json({ message: "Periodo ja esta aberto." });
  }

  const reopened = await prisma.billingPeriod.update({
    where: { id: period.id },
    data: {
      status: BillingStatus.OPEN,
      closedAt: null,
      closedById: null,
      totalAmount: null
    }
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      entity: "BillingPeriod",
      entityId: period.id,
      action: "REOPEN_PERIOD",
      metadata: {
        previousClosedAt: period.closedAt,
        previousClosedById: period.closedById,
        previousTotalAmount: period.totalAmount
      }
    }
  });

  res.json({ period: serializePeriod(reopened) });
}));

billingPeriodsRouter.get("/:id/report", asyncHandler(async (req, res) => {
  const summary = await calculatePeriodSummary(req.params.id);

  if (req.query.format === "pdf") {
    const buffer = await buildPeriodPdf(summary);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${sanitizeReportFilename(summary.period.label)}.pdf"`);
    return res.send(buffer);
  }

  if (req.query.format !== "xlsx") {
    return res.json({ report: summary });
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Relatorio");

  sheet.columns = [
    { header: "Funcionario", key: "employeeName", width: 30 },
    { header: "Quantidade", key: "quantity", width: 14 },
    { header: "Preco(s) aplicado(s)", key: "unitPrices", width: 22 },
    { header: "Valor a descontar", key: "amount", width: 20 }
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.addRows(summary.employeeTotals.map((item) => ({
    employeeName: item.employeeName,
    quantity: item.quantity,
    unitPrices: item.unitPrices.map((price) => `R$ ${price.toFixed(2)}`).join(", "),
    amount: item.amount
  })));
  sheet.addRow({});
  sheet.addRow({ employeeName: "Total geral", quantity: summary.totalQuantity, amount: summary.totalAmount });
  sheet.getColumn("amount").numFmt = '"R$"#,##0.00';

  const buffer = await workbook.xlsx.writeBuffer();

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${summary.period.label}.xlsx"`);

  return res.send(Buffer.from(buffer));
}));
