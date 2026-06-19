import { BillingStatus } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { formatDate, isBetween, isExpectedWorkday, parseDate } from "../lib/dates.js";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate, type AuthenticatedRequest } from "../middleware/auth.js";

export const mealRecordsRouter = Router();

mealRecordsRouter.use(authenticate);

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
  registeredById: string;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  ...record,
  date: formatDate(record.date)
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

mealRecordsRouter.post("/bulk", asyncHandler(async (req, res) => {
  const actor = (req as AuthenticatedRequest).user;
  const input = bulkSchema.parse(req.body);

  const period = await prisma.billingPeriod.findUnique({ where: { id: input.periodId } });
  if (!period) return res.status(404).json({ message: "Período não encontrado." });
  if (period.status === BillingStatus.CLOSED) {
    return res.status(409).json({ message: "Períodos fechados não podem ser editados." });
  }

  const employees = await prisma.employee.findMany({
    where: { id: { in: input.entries.map((entry) => entry.employeeId) } }
  });
  const employeeMap = new Map(employees.map((employee) => [employee.id, employee]));

  const warnings: Array<{ employeeId: string; employeeName: string; date: string; message: string }> = [];
  const records = [];

  for (const entry of input.entries) {
    const employee = employeeMap.get(entry.employeeId);
    if (!employee) return res.status(404).json({ message: "Funcionário não encontrado." });

    const date = parseDate(entry.date);
    if (!isBetween(date, period.startDate, period.endDate)) {
      return res.status(422).json({ message: `Data ${entry.date} fora do período selecionado.` });
    }

    if (entry.quantity > 0 && !isExpectedWorkday(date, employee.scheduleType)) {
      warnings.push({
        employeeId: employee.id,
        employeeName: employee.name,
        date: entry.date,
        message: "Lançamento fora da jornada esperada."
      });
    }

    if (entry.quantity === 0) {
      await prisma.mealRecord.deleteMany({
        where: { employeeId: employee.id, date }
      });
      continue;
    }

    const record = await prisma.mealRecord.upsert({
      where: { employeeId_date: { employeeId: employee.id, date } },
      update: { quantity: entry.quantity, registeredById: actor.id, periodId: period.id },
      create: {
        employeeId: employee.id,
        periodId: period.id,
        date,
        quantity: entry.quantity,
        registeredById: actor.id
      }
    });
    records.push(record);
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
