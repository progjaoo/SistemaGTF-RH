import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.js";
import { calculatePeriodSummary } from "../services/calculations.js";

export const dashboardRouter = Router();

dashboardRouter.use(authenticate);

dashboardRouter.get("/summary", asyncHandler(async (req, res) => {
  const periodId = String(req.query.periodId ?? "");
  if (!periodId) return res.status(400).json({ message: "Informe periodId." });

  const current = await calculatePeriodSummary(periodId);
  const previousPeriod = await prisma.billingPeriod.findFirst({
    where: { endDate: { lt: new Date(`${current.period.startDate}T00:00:00.000Z`) } },
    orderBy: { endDate: "desc" }
  });
  const previous = previousPeriod ? await calculatePeriodSummary(previousPeriod.id) : null;
  const amountDelta = previous ? current.totalAmount - previous.totalAmount : null;
  const quantityDelta = previous ? current.totalQuantity - previous.totalQuantity : null;

  res.json({
    summary: {
      current,
      previous: previous ? {
        period: previous.period,
        totalAmount: previous.totalAmount,
        totalQuantity: previous.totalQuantity
      } : null,
      amountDelta,
      quantityDelta
    }
  });
}));
