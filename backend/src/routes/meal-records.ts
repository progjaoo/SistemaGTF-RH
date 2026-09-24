import { BillingStatus, Prisma } from "@prisma/client";
import express from "express";
import { z } from "zod";
import { formatDate, isBetween, parseDate } from "../lib/dates.js";
import { normalizeSearch } from "../lib/names.js";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate, type AuthenticatedRequest } from "../middleware/auth.js";
import { assertNoFutureDates, isFutureDate } from "../services/date-rules.js";
import { applyMealEntry, type MealEntryWarning } from "../services/meal-entries.js";

export const mealRecordsRouter = express.Router();

mealRecordsRouter.use(authenticate);

type ConfirmationRow = {
  employeeId: string;
  employeeName: string;
  date: Date;
  quantity: number;
  confirmationStatus: "PENDING" | "PEGUEI" | "NAO_PEGUEI";
  confirmationSource: "SISTEMA" | "WHATSAPP" | null;
  confirmationNote: string | null;
  confirmedAt: Date | null;
};

const bulkSchema = z.object({
  periodId: z.string(),
  entries: z.array(z.object({
    employeeId: z.string(),
    date: z.string(),
    quantity: z.coerce.number().int().min(0).max(10)
  })).min(1)
});

const serializeRecord = (record: {
  id: string;
  employeeId: string;
  periodId: string;
  date: Date;
  quantity: number;
  confirmationStatus?: "PENDING" | "PEGUEI" | "NAO_PEGUEI";
  confirmationSource?: "SISTEMA" | "WHATSAPP" | null;
  confirmedAt?: Date | null;
  registeredById: string;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  ...record,
  date: formatDate(record.date),
  confirmationStatus: record.confirmationStatus ?? "PENDING",
  confirmationSource: record.confirmationSource ?? null,
  confirmedAt: record.confirmedAt?.toISOString() ?? null
});

mealRecordsRouter.get("/", asyncHandler(async (req, res) => {
  const periodId = String(req.query.periodId ?? "");
  if (!periodId) return res.status(400).json({ message: "Informe periodId." });

  const records = await prisma.mealRecord.findMany({
    where: { periodId },
    orderBy: [{ date: "asc" }],
    include: { employee: { select: { id: true, name: true, scheduleType: true } } }
  });

  res.json({ records: records.map((record) => ({ ...serializeRecord(record), employee: record.employee })) });
}));

mealRecordsRouter.get("/confirmations", asyncHandler(async (req, res) => {
  const periodId = String(req.query.periodId ?? "");
  const dateQuery = req.query.date ? String(req.query.date) : "";

  if (!periodId) return res.status(400).json({ message: "Informe periodId." });

  const period = await prisma.billingPeriod.findUnique({ where: { id: periodId } });
  if (!period) return res.status(404).json({ message: "Período não encontrado." });

  const date = dateQuery ? parseDate(dateQuery) : null;
  if (date && !isBetween(date, period.startDate, period.endDate)) {
    return res.status(422).json({ message: `Data ${dateQuery} fora do período selecionado.` });
  }

  const dateFilter = dateQuery ? Prisma.sql`AND mr."date" = ${dateQuery}::date` : Prisma.empty;
  const records = await prisma.$queryRaw<ConfirmationRow[]>(Prisma.sql`
    SELECT
      mr."employeeId" AS "employeeId",
      e."name" AS "employeeName",
      mr."date" AS "date",
      mr."quantity" AS "quantity",
      mr."confirmationStatus"::text AS "confirmationStatus",
      mr."confirmationSource"::text AS "confirmationSource",
      mr."confirmationNote" AS "confirmationNote",
      mr."confirmedAt" AS "confirmedAt"
    FROM "MealRecord" mr
    INNER JOIN "Employee" e ON e."id" = mr."employeeId"
    WHERE mr."periodId" = ${periodId}::uuid
    ${dateFilter}
    ORDER BY mr."date" ASC, e."name" ASC
  `);

  const confirmations = records
    .map((record) => ({
      employeeId: record.employeeId,
      employeeName: record.employeeName,
      date: formatDate(record.date),
      quantity: record.quantity,
      confirmationStatus: record.confirmationStatus,
      confirmationSource: record.confirmationSource,
      confirmationNote: record.confirmationNote,
      confirmedAt: record.confirmedAt?.toISOString() ?? null
    }))
    .sort((first, second) => {
      if (first.date !== second.date) return first.date.localeCompare(second.date);
      return first.employeeName.localeCompare(second.employeeName, "pt-BR", { sensitivity: "base" });
    });

  res.json({ confirmations });
}));

mealRecordsRouter.post("/bulk", asyncHandler(async (req, res) => {
  const actor = (req as AuthenticatedRequest).user;
  const input = bulkSchema.parse(req.body);

  const period = await prisma.billingPeriod.findUnique({ where: { id: input.periodId } });
  if (!period) return res.status(404).json({ message: "Período não encontrado." });
  if (period.status === BillingStatus.CLOSED) {
    return res.status(409).json({ message: "Períodos fechados não podem ser editados." });
  }

  const parsedEntries = input.entries.map((entry) => ({ ...entry, dateValue: parseDate(entry.date) }));
  const futureDateValidation = assertNoFutureDates(parsedEntries.map((entry) => entry.dateValue));
  if (!futureDateValidation.ok) {
    return res.status(422).json({
      message: "Existem lançamentos com data futura.",
      invalidDates: futureDateValidation.invalidDates
    });
  }

  const employees = await prisma.employee.findMany({
    where: { id: { in: input.entries.map((entry) => entry.employeeId) } }
  });
  const employeeMap = new Map(employees.map((employee) => [employee.id, employee]));

  const warnings: MealEntryWarning[] = [];
  const records = [];

  for (const entry of parsedEntries) {
    const employee = employeeMap.get(entry.employeeId);
    if (!employee) return res.status(404).json({ message: "Funcionário não encontrado." });

    const date = entry.dateValue;
    if (!isBetween(date, period.startDate, period.endDate)) {
      return res.status(422).json({ message: `Data ${entry.date} fora do período selecionado.` });
    }

    const record = await applyMealEntry({
      employee,
      periodId: period.id,
      actorId: actor.id,
      date,
      dateLabel: entry.date,
      quantity: entry.quantity,
      warnings
    });
    if (record) records.push(record);
  }

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      entity: "MealRecord",
      action: "BULK_UPSERT_RECORDS",
      metadata: { periodId: input.periodId, count: input.entries.length, warnings }
    }
  });

  res.json({ records: records.map(serializeRecord), warnings });
}));

const importRowSchema = z.object({
  name: z.string().trim().min(1).optional(),
  employeeId: z.string().optional(),
  date: z.string(),
  quantity: z.coerce.number().int().min(0).max(10)
}).refine((row) => row.name || row.employeeId, {
  message: "Informe name ou employeeId em cada linha."
});

const importSchema = z.object({
  periodId: z.string(),
  dryRun: z.boolean().optional().default(false),
  rows: z.array(importRowSchema).min(1).max(2000)
});

type ImportPreviewRow = {
  index: number;
  name: string;
  date: string;
  quantity: number;
  status: "ok" | "error";
  message?: string;
  employeeId?: string;
  employeeName?: string;
};

// Importação assistida da planilha da gestora: valida linha a linha
// (preview/dry-run) e só grava quando todas passam. Nunca cria período
// nem funcionário — só lança em período OPEN existente.
mealRecordsRouter.post("/import", asyncHandler(async (req, res) => {
  const actor = (req as AuthenticatedRequest).user;
  const input = importSchema.parse(req.body);

  const period = await prisma.billingPeriod.findUnique({ where: { id: input.periodId } });
  if (!period) return res.status(404).json({ message: "Período não encontrado." });
  if (period.status === BillingStatus.CLOSED) {
    return res.status(409).json({ message: "Períodos fechados não podem ser editados." });
  }

  const employees = await prisma.employee.findMany({ orderBy: [{ name: "asc" }] });
  const byId = new Map(employees.map((employee) => [employee.id, employee]));

  const preview: ImportPreviewRow[] = [];
  const valid: Array<{ employeeId: string; date: Date; dateLabel: string; quantity: number }> = [];

  input.rows.forEach((row, position) => {
    const index = position + 1;
    const base = { index, name: row.name ?? "", date: row.date, quantity: row.quantity };
    const fail = (message: string): void => {
      preview.push({ ...base, status: "error" as const, message });
    };

    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date)) {
      fail("Data inválida. Use o formato YYYY-MM-DD.");
      return;
    }
    const dateValue = parseDate(row.date);
    if (isFutureDate(dateValue)) {
      fail(`Data ${row.date} é futura.`);
      return;
    }
    if (!isBetween(dateValue, period.startDate, period.endDate)) {
      fail(`Data ${row.date} fora do período selecionado.`);
      return;
    }

    if (row.employeeId) {
      const employee = byId.get(row.employeeId);
      if (!employee) {
        fail("Funcionário não encontrado.");
        return;
      }
      preview.push({ ...base, status: "ok", employeeId: employee.id, employeeName: employee.name });
      valid.push({ employeeId: employee.id, date: dateValue, dateLabel: row.date, quantity: row.quantity });
      return;
    }

    const query = normalizeSearch(row.name as string);
    const exact = employees.filter((employee) => normalizeSearch(employee.name) === query);
    const candidates = exact.length > 0
      ? exact
      : employees.filter((employee) => normalizeSearch(employee.name).includes(query));
    if (candidates.length === 0) {
      fail(`Funcionário não encontrado: ${row.name}.`);
      return;
    }
    if (candidates.length > 1) {
      fail(`Nome ambíguo: ${row.name} (${candidates.length} cadastros). Use o nome completo.`);
      return;
    }
    const employee = candidates[0];
    preview.push({ ...base, status: "ok", employeeId: employee.id, employeeName: employee.name });
    valid.push({ employeeId: employee.id, date: dateValue, dateLabel: row.date, quantity: row.quantity });
  });

  const invalidCount = preview.filter((row) => row.status === "error").length;

  if (input.dryRun || invalidCount > 0) {
    return res
      .status(!input.dryRun && invalidCount > 0 ? 422 : 200)
      .json({ preview, valid: invalidCount === 0, invalidCount });
  }

  const warnings: MealEntryWarning[] = [];
  const records = [];
  for (const entry of valid) {
    const employee = byId.get(entry.employeeId);
    if (!employee) continue;
    const record = await applyMealEntry({
      employee,
      periodId: period.id,
      actorId: actor.id,
      date: entry.date,
      dateLabel: entry.dateLabel,
      quantity: entry.quantity,
      warnings
    });
    if (record) records.push(record);
  }

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      entity: "MealRecord",
      action: "IMPORT_PLANILHA",
      metadata: { periodId: input.periodId, count: input.rows.length, warnings }
    }
  });

  res.json({ records: records.map(serializeRecord), warnings, preview });
}));
