import type { BillingPeriod, Employee, MealPrice, MealRecord } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { formatDate } from "../lib/dates.js";

type RecordWithEmployee = MealRecord & { employee: Employee };

function priceApplies(price: MealPrice, employeeId: string, date: Date) {
  const recordDate = formatDate(date);
  const validFrom = formatDate(price.validFrom);
  const validTo = price.validTo ? formatDate(price.validTo) : null;
  const employeeMatches = price.employeeId === employeeId || price.employeeId === null;

  return employeeMatches && validFrom <= recordDate && (!validTo || validTo >= recordDate);
}

export function resolveMealPrice(prices: MealPrice[], employeeId: string, date: Date) {
  const sorted = [...prices].sort((a, b) => formatDate(b.validFrom).localeCompare(formatDate(a.validFrom)));
  return sorted.find((price) => price.employeeId === employeeId && priceApplies(price, employeeId, date))
    ?? sorted.find((price) => price.employeeId === null && priceApplies(price, employeeId, date));
}

export async function calculatePeriodSummary(periodId: string) {
  const period = await prisma.billingPeriod.findUnique({ where: { id: periodId } });

  if (!period) {
    throw new Error("Período não encontrado.");
  }

  const [records, prices] = await Promise.all([
    prisma.mealRecord.findMany({
      where: { periodId },
      include: { employee: true },
      orderBy: [{ date: "asc" }, { employee: { name: "asc" } }]
    }),
    prisma.mealPrice.findMany()
  ]);

  const employeeMap = new Map<string, {
    employeeId: string;
    employeeName: string;
    quantity: number;
    amount: number;
    unitPrices: Set<number>;
    taken: number;
    notTaken: number;
    pending: number;
  }>();
  const dailyMap = new Map<string, { date: string; quantity: number; amount: number }>();

  let totalQuantity = 0;
  let totalAmount = 0;

  for (const record of records as RecordWithEmployee[]) {
    const price = resolveMealPrice(prices, record.employeeId, record.date);
    const unitPrice = price ? Number(price.value) : 0;
    // PLAN-005: o colaborador rege — só PEGUEI é faturável.
    const billable = record.confirmationStatus === "PEGUEI";
    const quantity = billable ? record.quantity : 0;
    const amount = unitPrice * quantity;
    const dateKey = formatDate(record.date);

    totalQuantity += quantity;
    totalAmount += amount;

    const employeeTotal = employeeMap.get(record.employeeId) ?? {
      employeeId: record.employeeId,
      employeeName: record.employee.name,
      quantity: 0,
      amount: 0,
      unitPrices: new Set<number>(),
      taken: 0,
      notTaken: 0,
      pending: 0
    };
    employeeTotal.quantity += quantity;
    employeeTotal.amount += amount;
    employeeTotal.unitPrices.add(unitPrice);
    if (record.confirmationStatus === "PEGUEI") employeeTotal.taken += 1;
    else if (record.confirmationStatus === "NAO_PEGUEI") employeeTotal.notTaken += 1;
    else employeeTotal.pending += 1;
    employeeMap.set(record.employeeId, employeeTotal);

    const dailyTotal = dailyMap.get(dateKey) ?? { date: dateKey, quantity: 0, amount: 0 };
    dailyTotal.quantity += quantity;
    dailyTotal.amount += amount;
    dailyMap.set(dateKey, dailyTotal);
  }

  return {
    period: serializePeriod(period),
    totalQuantity,
    totalAmount: roundCurrency(totalAmount),
    employeeTotals: [...employeeMap.values()]
      .map((item) => ({
        employeeId: item.employeeId,
        employeeName: item.employeeName,
        quantity: item.quantity,
        amount: roundCurrency(item.amount),
        unitPrices: [...item.unitPrices].sort((a, b) => a - b),
        taken: item.taken,
        notTaken: item.notTaken,
        pending: item.pending
      }))
      .sort((a, b) => b.quantity - a.quantity || a.employeeName.localeCompare(b.employeeName)),
    dailyTrend: [...dailyMap.values()].map((item) => ({
      ...item,
      amount: roundCurrency(item.amount)
    }))
  };
}

export function serializePeriod(period: BillingPeriod) {
  return {
    ...period,
    startDate: formatDate(period.startDate),
    endDate: formatDate(period.endDate),
    totalAmount: period.totalAmount === null ? null : Number(period.totalAmount)
  };
}

export function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}
