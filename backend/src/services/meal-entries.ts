import type { Employee } from "@prisma/client";
import { isExpectedWorkday } from "../lib/dates.js";
import { prisma } from "../lib/prisma.js";

export type MealEntryWarning = {
  employeeId: string;
  employeeName: string;
  date: string;
  message: string;
};

// Aplica UM lançamento já validado (funcionário existe, data no período,
// sem data futura, período aberto). Usado pelo bulk e pela importação de
// planilha — mesma escrita, mesma auditoria de origem, sem divergência.
export async function applyMealEntry(args: {
  employee: Employee;
  periodId: string;
  actorId: string;
  date: Date;
  dateLabel: string;
  quantity: number;
  warnings: MealEntryWarning[];
}) {
  const { employee, periodId, actorId, date, dateLabel, quantity, warnings } = args;

  if (quantity > 0 && !isExpectedWorkday(date, employee.scheduleType, employee.workdays ?? null)) {
    warnings.push({
      employeeId: employee.id,
      employeeName: employee.name,
      date: dateLabel,
      message: "Lançamento fora da jornada esperada."
    });
  }

  if (quantity === 0) {
    await prisma.mealRecord.deleteMany({
      where: { employeeId: employee.id, date }
    });
    return null;
  }

  return prisma.mealRecord.upsert({
    where: { employeeId_date: { employeeId: employee.id, date } },
    update: { quantity, registeredById: actorId, periodId },
    create: {
      employeeId: employee.id,
      periodId,
      date,
      quantity,
      registeredById: actorId
    }
  });
}
