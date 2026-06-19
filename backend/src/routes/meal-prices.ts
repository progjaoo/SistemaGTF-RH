import { Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { parseDate } from "../lib/dates.js";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";

export const mealPricesRouter = Router();

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
  employeeId: price.employeeId,
  employee: price.employee ?? null,
  createdAt: price.createdAt
});

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
  const price = await prisma.mealPrice.create({
    data: {
      value: input.value,
      validFrom: parseDate(input.validFrom),
      validTo: input.validTo ? parseDate(input.validTo) : null,
      employeeId: input.employeeId || null,
      createdById: actor.id
    },
    include: { employee: { select: { id: true, name: true } } }
  });

  await prisma.auditLog.create({
    data: { actorId: actor.id, entity: "MealPrice", entityId: price.id, action: "CREATE_PRICE" }
  });

  res.status(201).json({ price: serializePrice(price) });
}));
