import { BillingStatus, EmployeeStatus, Prisma } from "@prisma/client";
import express from "express";
import { z } from "zod";
import { formatDate, parseDate } from "../lib/dates.js";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { emitMealConfirmationUpdated } from "../realtime.js";
import { formatDateKeyInSaoPaulo, isFutureDate } from "../services/date-rules.js";

export const employeePortalRouter = express.Router();

type PortalDayRow = {
  id: string;
  date: Date;
  quantity: number;
  confirmationStatus: "PENDING" | "PEGUEI" | "NAO_PEGUEI";
  confirmationSource: "SISTEMA" | "WHATSAPP" | null;
  confirmedAt: Date | null;
  periodId: string;
  periodLabel: string;
  periodStatus: BillingStatus;
};

const searchSchema = z.object({
  name: z.string().trim().min(2, "Informe pelo menos 2 caracteres.")
});

const calendarSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Use o formato YYYY-MM.").optional()
});

const checkinSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use o formato YYYY-MM-DD."),
  status: z.enum(["PEGUEI", "NAO_PEGUEI"])
});

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function monthBounds(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const startDate = parseDate(`${year}-${String(monthNumber).padStart(2, "0")}-01`);
  const endDate = new Date(Date.UTC(year, monthNumber, 0));

  return { startDate, endDate };
}

employeePortalRouter.get("/search", asyncHandler(async (req, res) => {
  const input = searchSchema.parse(req.query);
  const query = normalizeSearch(input.name);
  const employees = await prisma.employee.findMany({
    where: { status: EmployeeStatus.ACTIVE },
    select: { id: true, name: true },
    orderBy: [{ name: "asc" }]
  });

  const matches = employees
    .filter((employee) => normalizeSearch(employee.name).includes(query))
    .slice(0, 20);

  res.json({ employees: matches });
}));

employeePortalRouter.get("/:employeeId/calendar", asyncHandler(async (req, res) => {
  const input = calendarSchema.parse(req.query);
  const month = input.month ?? formatDateKeyInSaoPaulo().slice(0, 7);
  const { startDate, endDate } = monthBounds(month);

  const employee = await prisma.employee.findFirst({
    where: { id: req.params.employeeId, status: EmployeeStatus.ACTIVE },
    select: { id: true, name: true }
  });

  if (!employee) return res.status(404).json({ message: "Funcionário não encontrado." });

  const records = await prisma.$queryRaw<PortalDayRow[]>(Prisma.sql`
    SELECT
      mr."id" AS "id",
      mr."date" AS "date",
      mr."quantity" AS "quantity",
      mr."confirmationStatus"::text AS "confirmationStatus",
      mr."confirmationSource"::text AS "confirmationSource",
      mr."confirmedAt" AS "confirmedAt",
      bp."id" AS "periodId",
      bp."label" AS "periodLabel",
      bp."status" AS "periodStatus"
    FROM "MealRecord" mr
    INNER JOIN "BillingPeriod" bp ON bp."id" = mr."periodId"
    WHERE mr."employeeId" = ${employee.id}::uuid
      AND mr."date" >= ${formatDate(startDate)}::date
      AND mr."date" <= ${formatDate(endDate)}::date
      AND mr."quantity" > 0
    ORDER BY mr."date" ASC
  `);

  res.json({
    employee,
    month,
    days: records.map((record) => ({
      id: record.id,
      date: formatDate(record.date),
      quantity: record.quantity,
      confirmationStatus: record.confirmationStatus,
      confirmationSource: record.confirmationSource,
      confirmedAt: record.confirmedAt?.toISOString() ?? null,
      period: {
        id: record.periodId,
        label: record.periodLabel,
        status: record.periodStatus
      }
    }))
  });
}));

employeePortalRouter.post("/:employeeId/checkin", asyncHandler(async (req, res) => {
  const input = checkinSchema.parse(req.body);
  const date = parseDate(input.date);

  if (isFutureDate(date)) {
    return res.status(422).json({ message: "Não é possível confirmar almoço em data futura." });
  }

  const employee = await prisma.employee.findFirst({
    where: { id: req.params.employeeId, status: EmployeeStatus.ACTIVE },
    select: { id: true, name: true }
  });

  if (!employee) return res.status(404).json({ message: "Funcionário não encontrado." });

  const record = await prisma.mealRecord.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date } },
    include: { period: true }
  });

  if (!record || record.quantity <= 0) {
    return res.status(404).json({ message: "Não existe lançamento de almoço para esta data." });
  }

  if (record.period.status === BillingStatus.CLOSED) {
    return res.status(422).json({ message: "Períodos fechados não aceitam confirmação de almoço." });
  }

  await prisma.$executeRaw`
    UPDATE "MealRecord"
    SET
      "confirmationStatus" = ${input.status}::"ConfirmationStatus",
      "confirmationSource" = 'SISTEMA'::"ConfirmationSource",
      "confirmedAt" = NOW(),
      "updatedAt" = NOW()
    WHERE "id" = ${record.id}::uuid
  `;

  const [updated] = await prisma.$queryRaw<PortalDayRow[]>(Prisma.sql`
    SELECT
      mr."id" AS "id",
      mr."date" AS "date",
      mr."quantity" AS "quantity",
      mr."confirmationStatus"::text AS "confirmationStatus",
      mr."confirmationSource"::text AS "confirmationSource",
      mr."confirmedAt" AS "confirmedAt",
      bp."id" AS "periodId",
      bp."label" AS "periodLabel",
      bp."status" AS "periodStatus"
    FROM "MealRecord" mr
    INNER JOIN "BillingPeriod" bp ON bp."id" = mr."periodId"
    WHERE mr."id" = ${record.id}::uuid
    LIMIT 1
  `);

  await prisma.auditLog.create({
    data: {
      entity: "MealRecord",
      entityId: updated.id,
      action: "EMPLOYEE_PORTAL_CHECKIN",
      metadata: {
        employeeId: employee.id,
        employeeName: employee.name,
        date: input.date,
        status: input.status,
        source: "SISTEMA",
        ip: req.ip,
        userAgent: req.get("user-agent") ?? null
      } satisfies Prisma.JsonObject
    }
  });

  const recordPayload = {
    id: updated.id,
    employeeId: employee.id,
    date: formatDate(updated.date),
    quantity: updated.quantity,
    confirmationStatus: updated.confirmationStatus,
    confirmationSource: updated.confirmationSource,
    confirmedAt: updated.confirmedAt?.toISOString() ?? null,
    period: {
      id: updated.periodId,
      label: updated.periodLabel,
      status: updated.periodStatus
    }
  };

  emitMealConfirmationUpdated({
    periodId: updated.periodId,
    confirmation: {
      employeeId: employee.id,
      employeeName: employee.name,
      date: recordPayload.date,
      quantity: updated.quantity,
      confirmationStatus: updated.confirmationStatus,
      confirmationSource: updated.confirmationSource,
      confirmedAt: recordPayload.confirmedAt
    }
  });

  res.json({
    record: recordPayload
  });
}));
