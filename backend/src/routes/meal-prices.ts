import { Role } from "@prisma/client";
import express from "express";
import { z } from "zod";
import { formatDate, parseDate } from "../lib/dates.js";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { formatDateKeyInSaoPaulo } from "../services/date-rules.js";

export const mealPricesRouter = express.Router();

mealPricesRouter.use(authenticate);

const priceSchema = z.object({
  value: z.coerce.number().positive(),
  validFrom: z.string(),
  validTo: z.string().optional().nullable(),
  employeeId: z.string().optional().nullable()
});

const serializePrice = (price: {
  id: string;
  value: unknown;
  validFrom: Date;
  validTo: Date | null;
  employeeId: string | null;
  createdAt: Date;
  employee?: { id: string; name: string } | null;
}) => ({
  id: price.id,
  value: Number(price.value),
  validFrom: price.validFrom.toISOString().slice(0, 10),
  validTo: price.validTo?.toISOString().slice(0, 10) ?? null,
  status: priceStatus(price.validFrom, price.validTo),
  employeeId: price.employeeId,
  employee: price.employee ?? null,
  createdAt: price.createdAt
});

// Status da vigência contra o hoje da VPS (America/Sao_Paulo).
export function priceStatus(validFrom: Date, validTo: Date | null): "VIGENTE" | "FUTURA" | "ENCERRADA" {
  const today = formatDateKeyInSaoPaulo();
  if (formatDate(validFrom) > today) return "FUTURA";
  if (validTo && formatDate(validTo) < today) return "ENCERRADA";
  return "VIGENTE";
}

// Vigências do mesmo escopo (global × global, funcionário × mesmo funcionário)
// não podem se sobrepor. Intervalos: [validFrom, validTo ?? +∞).
async function findOverlap(args: {
  employeeId: string | null;
  validFrom: Date;
  validTo: Date | null;
  ignoreId?: string;
}) {
  const candidates = await prisma.mealPrice.findMany({
    where: {
      employeeId: args.employeeId,
      ...(args.ignoreId ? { id: { not: args.ignoreId } } : {})
    },
    select: { id: true, validFrom: true, validTo: true }
  });
  const start = formatDate(args.validFrom);
  const end = args.validTo ? formatDate(args.validTo) : null;
  return candidates.filter((other) => {
    const otherStart = formatDate(other.validFrom);
    const otherEnd = other.validTo ? formatDate(other.validTo) : null;
    return otherStart <= (end ?? "9999-12-31") && (otherEnd === null || otherEnd >= start);
  });
}

// Períodos CLOSED cruzando a vigência: reescrevê-la mudaria relatório congelado.
async function crossesClosedPeriod(validFrom: Date, validTo: Date | null) {
  const closed = await prisma.billingPeriod.findMany({
    where: { status: "CLOSED" },
    select: { startDate: true, endDate: true, label: true }
  });
  const start = formatDate(validFrom);
  const end = validTo ? formatDate(validTo) : null;
  return closed.filter(
    (period) => formatDate(period.startDate) <= (end ?? "9999-12-31") && formatDate(period.endDate) >= start
  );
}

mealPricesRouter.get("/", asyncHandler(async (_req, res) => {
  const prices = await prisma.mealPrice.findMany({
    include: { employee: { select: { id: true, name: true } } },
    orderBy: [{ employeeId: "asc" }, { validFrom: "desc" }]
  });

  res.json({ prices: prices.map(serializePrice) });
}));

mealPricesRouter.post("/", requireRole(Role.RH), asyncHandler(async (req, res) => {
  const actor = (req as AuthenticatedRequest).user;
  const input = priceSchema.parse(req.body);
  const validFrom = parseDate(input.validFrom);
  const validTo = input.validTo ? parseDate(input.validTo) : null;
  if (validTo && validTo < validFrom) {
    return res.status(422).json({ message: "Vigência final deve ser posterior à inicial." });
  }
  const employeeId = input.employeeId || null;
  const overlapping = await findOverlap({ employeeId, validFrom, validTo });
  if (overlapping.length > 0) {
    return res.status(422).json({ message: "Já existe vigência sobreposta para este escopo." });
  }
  const price = await prisma.mealPrice.create({
    data: {
      value: input.value,
      validFrom,
      validTo,
      employeeId,
      createdById: actor.id
    },
    include: { employee: { select: { id: true, name: true } } }
  });

  await prisma.auditLog.create({
    data: { actorId: actor.id, entity: "MealPrice", entityId: price.id, action: "CREATE_PRICE" }
  });

  res.status(201).json({ price: serializePrice(price) });
}));

mealPricesRouter.put("/:id", requireRole(Role.RH), asyncHandler(async (req, res) => {
  const actor = (req as AuthenticatedRequest).user;
  const input = priceSchema.parse(req.body);
  const existing = await prisma.mealPrice.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ message: "Preço não encontrado." });

  const validFrom = parseDate(input.validFrom);
  const validTo = input.validTo ? parseDate(input.validTo) : null;
  if (validTo && validTo < validFrom) {
    return res.status(422).json({ message: "Vigência final deve ser posterior à inicial." });
  }
  const employeeId = input.employeeId || null;

  // Primeiro a trava mais forte: vigência ANTIGA cruzando período fechado
  // não pode ser reescrita (reescreveria relatório congelado).
  const frozen = await crossesClosedPeriod(existing.validFrom, existing.validTo);
  if (frozen.length > 0) {
    return res.status(409).json({
      message: "Preço com histórico em período fechado não pode ser alterado. Encerre a vigência e crie uma nova.",
      closedPeriods: frozen.map((period) => period.label)
    });
  }

  const overlapping = await findOverlap({ employeeId, validFrom, validTo, ignoreId: existing.id });
  if (overlapping.length > 0) {
    return res.status(422).json({ message: "Já existe vigência sobreposta para este escopo." });
  }

  const price = await prisma.mealPrice.update({
    where: { id: existing.id },
    data: { value: input.value, validFrom, validTo, employeeId },
    include: { employee: { select: { id: true, name: true } } }
  });

  await prisma.auditLog.create({
    data: { actorId: actor.id, entity: "MealPrice", entityId: price.id, action: "UPDATE_PRICE" }
  });

  res.json({ price: serializePrice(price) });
}));

// Encerra a vigência sem apagar (histórico de relatórios fechados intacto).
mealPricesRouter.post("/:id/close", requireRole(Role.RH), asyncHandler(async (req, res) => {
  const actor = (req as AuthenticatedRequest).user;
  const input = z.object({ endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use o formato YYYY-MM-DD.") }).parse(req.body);
  const existing = await prisma.mealPrice.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ message: "Preço não encontrado." });

  const endDate = parseDate(input.endDate);
  if (endDate < existing.validFrom) {
    return res.status(422).json({ message: "Data final deve ser posterior ao início da vigência." });
  }

  const price = await prisma.mealPrice.update({
    where: { id: existing.id },
    data: { validTo: endDate },
    include: { employee: { select: { id: true, name: true } } }
  });

  await prisma.auditLog.create({
    data: { actorId: actor.id, entity: "MealPrice", entityId: price.id, action: "CLOSE_PRICE" }
  });

  res.json({ price: serializePrice(price) });
}));
