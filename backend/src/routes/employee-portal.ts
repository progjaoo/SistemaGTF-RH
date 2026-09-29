import { BillingStatus, EmployeeStatus, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import express from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { config } from "../config.js";
import { formatDate, parseDate } from "../lib/dates.js";
import { normalizeSearch } from "../lib/names.js";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticatePortal, type PortalRequest } from "../middleware/auth.js";
import { portalLoginLimiter } from "../middleware/rate-limit.js";
import { portalLimiter } from "../middleware/rate-limit.js";
import { emitMealConfirmationUpdated } from "../realtime.js";
import { formatDateKeyInSaoPaulo, isFutureDate } from "../services/date-rules.js";

export const employeePortalRouter = express.Router();

// Anti-robô no portal público (60 req/min por IP). Tentativas além do
// limite retornam 429 e são auditadas como PORTAL_RATE_LIMITED.
employeePortalRouter.use(portalLimiter);

type PortalDayRow = {
  id: string;
  date: Date;
  quantity: number;
  confirmationStatus: "PENDING" | "PEGUEI" | "NAO_PEGUEI";
  confirmationSource: "SISTEMA" | "WHATSAPP" | null;
  confirmationNote: string | null;
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
  status: z.enum(["PEGUEI", "NAO_PEGUEI"]),
  // Observação sempre aceita (≤500); obrigatória em marcação atrasada.
  note: z.string().trim().max(500).optional()
});

const portalLoginSchema = z.object({
  employeeId: z.string(),
  code: z.string().regex(/^\d{6}$/, "Código com 6 dígitos."),
  remember: z.boolean().optional().default(false)
});

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
    select: { id: true, name: true, accessCodeHash: true },
    orderBy: [{ name: "asc" }]
  });

  const matches = employees
    .filter((employee) => normalizeSearch(employee.name).includes(query))
    .slice(0, 20)
    .map((employee) => ({
      id: employee.id,
      name: employee.name,
      hasAccess: employee.accessCodeHash !== null
    }));

  await prisma.auditLog.create({
    data: {
      entity: "Employee",
      action: "PORTAL_SEARCH",
      metadata: {
        query: input.name,
        matches: matches.length,
        ip: req.ip ?? null,
        userAgent: req.get("user-agent") ?? null
      }
    }
  });

  res.json({ employees: matches });
}));

// Login do colaborador: nome (via search) + código de 6 dígitos definidos
// pelo RH. Emite token de escopo "employee-portal" válido por um turno (8h).
employeePortalRouter.post("/login", portalLoginLimiter, asyncHandler(async (req, res) => {
  const input = portalLoginSchema.parse(req.body);
  const employee = await prisma.employee.findFirst({
    where: { id: input.employeeId, status: EmployeeStatus.ACTIVE }
  });

  if (!employee || !employee.accessCodeHash) {
    await prisma.auditLog.create({
      data: {
        entity: "Employee",
        entityId: input.employeeId,
        action: "PORTAL_LOGIN_FAILED",
        metadata: { reason: "no-access", ip: req.ip ?? null }
      }
    });
    return res.status(401).json({ message: "Sem acesso ativado. Procure o RH." });
  }

  const codeMatches = await bcrypt.compare(input.code, employee.accessCodeHash);
  if (!codeMatches) {
    await prisma.auditLog.create({
      data: {
        entity: "Employee",
        entityId: employee.id,
        action: "PORTAL_LOGIN_FAILED",
        metadata: { reason: "wrong-code", ip: req.ip ?? null }
      }
    });
    return res.status(401).json({ message: "Código inválido." });
  }

  const token = jwt.sign({ sub: employee.id, scope: "employee-portal" }, config.jwtSecret, {
    expiresIn: input.remember ? "30d" : "8h"
  });

  // Ativação: primeiro login com código marca o acesso como ativo.
  // O último acesso é atualizado a cada login ok (isFirstAccess segue
  // para a auditoria PORTAL_ACTIVATED vs PORTAL_LOGIN).
  const isFirstAccess = !employee.firstPortalAccessAt;
  await prisma.employee.update({
    where: { id: employee.id },
    data: { firstPortalAccessAt: employee.firstPortalAccessAt ?? new Date(), lastPortalAccessAt: new Date() }
  });

  await prisma.auditLog.create({
    data: {
      entity: "Employee",
      entityId: employee.id,
      action: isFirstAccess ? "PORTAL_ACTIVATED" : "PORTAL_LOGIN",
      metadata: { ip: req.ip ?? null, userAgent: req.get("user-agent") ?? null, remember: input.remember }
    }
  });

  res.json({ token, employee: { id: employee.id, name: employee.name }, portalStatus: "active" });
}));

employeePortalRouter.get("/:employeeId/calendar", authenticatePortal, asyncHandler(async (req, res) => {
  const portalEmployee = (req as PortalRequest).portalEmployee;
  if (portalEmployee.id !== req.params.employeeId) {
    return res.status(403).json({ message: "Sessão de outro colaborador." });
  }

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
      mr."confirmationNote" AS "confirmationNote",
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

  const todayKey = formatDateKeyInSaoPaulo();

  res.json({
    employee,
    month,
    days: records.map((record) => {
      const dateKey = formatDate(record.date);
      return {
        id: record.id,
        date: dateKey,
        quantity: record.quantity,
        confirmationStatus: record.confirmationStatus,
        confirmationSource: record.confirmationSource,
        confirmationNote: record.confirmationNote,
        isLate: dateKey < todayKey,
        confirmedAt: record.confirmedAt?.toISOString() ?? null,
        period: {
          id: record.periodId,
          label: record.periodLabel,
          status: record.periodStatus
        }
      };
    })
  });
}));

const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) })
});

employeePortalRouter.get("/:employeeId/push/vapid-key", authenticatePortal, asyncHandler(async (req, res) => {
  const portalEmployee = (req as PortalRequest).portalEmployee;
  if (portalEmployee.id !== req.params.employeeId) return res.status(403).json({ message: "Sessão de outro colaborador." });
  res.json({ publicKey: config.vapidPublicKey });
}));

employeePortalRouter.post("/:employeeId/push/subscriptions", authenticatePortal, asyncHandler(async (req, res) => {
  const portalEmployee = (req as PortalRequest).portalEmployee;
  if (portalEmployee.id !== req.params.employeeId) return res.status(403).json({ message: "Sessão de outro colaborador." });
  const input = pushSubscriptionSchema.parse(req.body);
  const sub = await prisma.pushSubscription.upsert({
    where: { endpoint: input.endpoint },
    update: { employeeId: portalEmployee.id, p256dh: input.keys.p256dh, auth: input.keys.auth },
    create: { employeeId: portalEmployee.id, endpoint: input.endpoint, p256dh: input.keys.p256dh, auth: input.keys.auth }
  });
  res.status(201).json({ subscription: { id: sub.id, endpoint: sub.endpoint } });
}));

employeePortalRouter.delete("/:employeeId/push/subscriptions", authenticatePortal, asyncHandler(async (req, res) => {
  const portalEmployee = (req as PortalRequest).portalEmployee;
  if (portalEmployee.id !== req.params.employeeId) return res.status(403).json({ message: "Sessão de outro colaborador." });
  const { endpoint } = z.object({ endpoint: z.string().url() }).parse(req.body);
  await prisma.pushSubscription.deleteMany({ where: { endpoint, employeeId: portalEmployee.id } });
  res.json({ ok: true });
}));

employeePortalRouter.post("/:employeeId/checkin", authenticatePortal, asyncHandler(async (req, res) => {
  const portalEmployee = (req as PortalRequest).portalEmployee;
  if (portalEmployee.id !== req.params.employeeId) {
    return res.status(403).json({ message: "Sessão de outro colaborador." });
  }

  const input = checkinSchema.parse(req.body);
  const date = parseDate(input.date);

  const dayClosed = await prisma.dayClose.findUnique({ where: { date } });
  if (dayClosed) return res.status(422).json({ message: "Dia fechado para lançamentos. Reabra o dia para editar." });

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

  const isLate = formatDate(date) < formatDateKeyInSaoPaulo();
  const note = input.note?.trim() ? input.note.trim() : null;
  if (isLate && !note) {
    return res.status(422).json({ message: "Justificativa obrigatória para marcação atrasada." });
  }

  // Self check-in: sem lançamento do RH, o colaborador cria o próprio
  // registro (quantidade 1) dentro de um período OPEN que cubra a data.
  // É assim que o dia fica "aberto para lançamento" e a gestora confere
  // em tempo real — antes o portal exigia lançamento prévio e devolvia 404.
  if (!record || record.quantity <= 0) {
    const openPeriod = await prisma.billingPeriod.findFirst({
      where: {
        status: BillingStatus.OPEN,
        startDate: { lte: date },
        endDate: { gte: date }
      }
    });

    if (!openPeriod) {
      return res.status(422).json({ message: "Nenhum período aberto para esta data. Fale com o RH." });
    }

    const created = await prisma.mealRecord.create({
      data: {
        employeeId: employee.id,
        periodId: openPeriod.id,
        date,
        quantity: 1,
        confirmationStatus: input.status,
        confirmationSource: "SISTEMA",
        confirmationNote: note,
        confirmedAt: new Date(),
        registeredById: null
      },
      include: { period: true }
    });

    await prisma.auditLog.create({
      data: {
        entity: "MealRecord",
        entityId: created.id,
        action: "EMPLOYEE_PORTAL_CHECKIN",
        metadata: {
          employeeId: employee.id,
          employeeName: employee.name,
          date: input.date,
          status: input.status,
          source: "SISTEMA",
          selfCreated: true,
          isLate,
          note,
          ip: req.ip,
          userAgent: req.get("user-agent") ?? null
        } satisfies Prisma.JsonObject
      }
    });

    const selfPayload = {
      id: created.id,
      employeeId: employee.id,
      date: formatDate(created.date),
      quantity: created.quantity,
      confirmationStatus: created.confirmationStatus,
      confirmationSource: created.confirmationSource,
      confirmationNote: created.confirmationNote,
      isLate,
      confirmedAt: created.confirmedAt?.toISOString() ?? null,
      period: {
        id: created.period.id,
        label: created.period.label,
        status: created.period.status
      }
    };

    emitMealConfirmationUpdated({
      periodId: created.periodId,
      confirmation: {
        employeeId: employee.id,
        employeeName: employee.name,
        date: selfPayload.date,
        quantity: created.quantity,
        confirmationStatus: created.confirmationStatus,
        confirmationSource: created.confirmationSource,
        confirmationNote: created.confirmationNote,
        confirmedAt: selfPayload.confirmedAt
      }
    });

    return res.json({ record: selfPayload });
  }

  if (record.period.status === BillingStatus.CLOSED) {
    return res.status(422).json({ message: "Períodos fechados não aceitam confirmação de almoço." });
  }

  // Confirmação é ato único: para alterar, o colaborador fala pessoalmente
  // com RH/gestora (decisão travada PLAN-001 §9).
  if (record.confirmationStatus !== "PENDING") {
    return res.status(409).json({ message: "Confirmação já registrada. Para alterar, fale pessoalmente com o RH." });
  }

  await prisma.$executeRaw`
    UPDATE "MealRecord"
    SET
      "confirmationStatus" = ${input.status}::"ConfirmationStatus",
      "confirmationSource" = 'SISTEMA'::"ConfirmationSource",
      "confirmationNote" = ${note},
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
      mr."confirmationNote" AS "confirmationNote",
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
        isLate,
        note,
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
    confirmationNote: updated.confirmationNote,
    isLate,
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
      confirmationNote: updated.confirmationNote,
      confirmedAt: recordPayload.confirmedAt
    }
  });

  res.json({
    record: recordPayload
  });
}));
