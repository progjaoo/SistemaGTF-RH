// Fábricas e limpeza para os testes de API. Cada arquivo usa sufixo próprio
// (emails/nomes únicos) e limpa o que criou — o banco é compartilhado.
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { prisma } from "../src/lib/prisma.js";

export const d = (value: string) => new Date(`${value}T00:00:00.000Z`);

export async function createUser(suffix: string, role: Role) {
  const passwordHash = await bcrypt.hash("senha-teste", 10);
  return prisma.user.create({
    data: { name: `Teste ${suffix}`, email: `teste-${suffix}@teste.com`, passwordHash, role }
  });
}

export async function createEmployee(suffix: string) {
  return prisma.employee.create({ data: { name: `Func ${suffix}` } });
}

export async function createPeriod(suffix: string, start: string, end: string) {
  return prisma.billingPeriod.create({
    data: { label: `Período ${suffix}`, startDate: d(start), endDate: d(end) }
  });
}

export async function createPrice(value: number, validFrom: string, employeeId?: string) {
  return prisma.mealPrice.create({
    data: { value, validFrom: d(validFrom), employeeId: employeeId ?? null }
  });
}

export async function cleanup(ids: {
  recordIds?: string[];
  priceIds?: string[];
  periodIds?: string[];
  employeeIds?: string[];
  userIds?: string[];
}) {
  // Ordem respeita as FKs.
  if (ids.recordIds?.length) await prisma.mealRecord.deleteMany({ where: { id: { in: ids.recordIds } } });
  if (ids.priceIds?.length) await prisma.mealPrice.deleteMany({ where: { id: { in: ids.priceIds } } });
  if (ids.periodIds?.length) {
    await prisma.mealRecord.deleteMany({ where: { periodId: { in: ids.periodIds } } });
    await prisma.billingPeriod.deleteMany({ where: { id: { in: ids.periodIds } } });
  }
  if (ids.employeeIds?.length) {
    await prisma.mealRecord.deleteMany({ where: { employeeId: { in: ids.employeeIds } } });
    await prisma.mealPrice.deleteMany({ where: { employeeId: { in: ids.employeeIds } } });
    await prisma.employee.deleteMany({ where: { id: { in: ids.employeeIds } } });
  }
  if (ids.userIds?.length) {
    await prisma.auditLog.deleteMany({ where: { actorId: { in: ids.userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: ids.userIds } } });
  }
}
