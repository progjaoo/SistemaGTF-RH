import { EmployeeStatus, Role, ScheduleType } from "@prisma/client";
import bcrypt from "bcryptjs";
import express from "express";
import { randomInt } from "node:crypto";
import { z } from "zod";
import { parseDate } from "../lib/dates.js";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";

export const employeesRouter = express.Router();

employeesRouter.use(authenticate);

const workdaysSchema = z
  .array(z.number().int().min(0).max(6))
  .min(1)
  .max(7)
  .optional()
  .nullable();

const employeeSchema = z.object({
  name: z.string().min(2),
  status: z.nativeEnum(EmployeeStatus).optional(),
  scheduleType: z.nativeEnum(ScheduleType),
  workdays: workdaysSchema,
  admissionDate: z.string().optional().nullable(),
  terminationDate: z.string().optional().nullable()
});

function serializeWorkdays(workdays: string | null): number[] | null {
  if (!workdays) return null;
  const days = [...new Set(
    workdays.split(",").map((day) => day.trim()).filter((day) => day !== "")
      .map((day) => Number(day)).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
  )].sort((a, b) => a - b);
  return days.length > 0 ? days : null;
}

function deserializeWorkdays(workdays: number[] | null | undefined): string | null {
  if (!workdays) return null;
  const days = [...new Set(workdays)].sort((a, b) => a - b);
  return days.length > 0 ? days.join(",") : null;
}

const serializeEmployee = (employee: {
  id: string;
  name: string;
  status: EmployeeStatus;
  scheduleType: ScheduleType;
  workdays: string | null;
  accessCodeHash: string | null;
  admissionDate: Date | null;
  terminationDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: employee.id,
  name: employee.name,
  status: employee.status,
  scheduleType: employee.scheduleType,
  workdays: serializeWorkdays(employee.workdays),
  // Nunca expor accessCodeHash: só o sinalizador.
  hasAccessCode: employee.accessCodeHash !== null,
  admissionDate: employee.admissionDate?.toISOString().slice(0, 10) ?? null,
  terminationDate: employee.terminationDate?.toISOString().slice(0, 10) ?? null
});

employeesRouter.get("/", asyncHandler(async (req, res) => {
  const search = String(req.query.search ?? "");
  const status = req.query.status ? String(req.query.status) as EmployeeStatus : undefined;

  const employees = await prisma.employee.findMany({
    where: {
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
      ...(status ? { status } : {})
    },
    orderBy: [{ status: "asc" }, { name: "asc" }]
  });

  res.json({ employees: employees.map(serializeEmployee) });
}));

employeesRouter.post("/", requireRole(Role.RH), asyncHandler(async (req, res) => {
  const actor = (req as AuthenticatedRequest).user;
  const input = employeeSchema.parse(req.body);
  const employee = await prisma.employee.create({
    data: {
      name: input.name,
      status: input.status ?? EmployeeStatus.ACTIVE,
      scheduleType: input.scheduleType,
      workdays: deserializeWorkdays(input.workdays),
      admissionDate: input.admissionDate ? parseDate(input.admissionDate) : null,
      terminationDate: input.terminationDate ? parseDate(input.terminationDate) : null
    }
  });

  await prisma.auditLog.create({
    data: { actorId: actor.id, entity: "Employee", entityId: employee.id, action: "CREATE_EMPLOYEE" }
  });

  res.status(201).json({ employee: serializeEmployee(employee) });
}));

employeesRouter.put("/:id", requireRole(Role.RH), asyncHandler(async (req, res) => {
  const actor = (req as AuthenticatedRequest).user;
  const input = employeeSchema.parse(req.body);
  const employee = await prisma.employee.update({
    where: { id: req.params.id },
    data: {
      name: input.name,
      status: input.status ?? EmployeeStatus.ACTIVE,
      scheduleType: input.scheduleType,
      workdays: deserializeWorkdays(input.workdays),
      admissionDate: input.admissionDate ? parseDate(input.admissionDate) : null,
      terminationDate: input.terminationDate ? parseDate(input.terminationDate) : null
    }
  });

  await prisma.auditLog.create({
    data: { actorId: actor.id, entity: "Employee", entityId: employee.id, action: "UPDATE_EMPLOYEE" }
  });

  res.json({ employee: serializeEmployee(employee) });
}));

employeesRouter.delete("/:id", requireRole(Role.RH), asyncHandler(async (req, res) => {
  const actor = (req as AuthenticatedRequest).user;
  const employee = await prisma.employee.update({
    where: { id: req.params.id },
    data: { status: EmployeeStatus.INACTIVE, terminationDate: new Date() }
  });

  await prisma.auditLog.create({
    data: { actorId: actor.id, entity: "Employee", entityId: employee.id, action: "INACTIVATE_EMPLOYEE" }
  });

  res.json({ employee: serializeEmployee(employee) });
}));

const accessCodeSchema = z.object({
  // Opcional: RH pode ditar o código. Ausente = sistema gera 6 dígitos.
  code: z.string().regex(/^\d{6}$/, "Código com 6 dígitos.").optional()
});

function generateAccessCode() {
  return String(randomInt(100000, 1000000));
}

// Define/reemite o código de acesso do colaborador (RH).
// O código em texto puro é retornado UMA única vez — o RH entrega ao
// colaborador e o sistema nunca o exibe de novo (só guarda o hash).
employeesRouter.put("/:id/access-code", requireRole(Role.RH), asyncHandler(async (req, res) => {
  const actor = (req as AuthenticatedRequest).user;
  const input = accessCodeSchema.parse(req.body);
  const employee = await prisma.employee.findUnique({ where: { id: req.params.id } });
  if (!employee) return res.status(404).json({ message: "Funcionário não encontrado." });

  const code = input.code ?? generateAccessCode();
  await prisma.employee.update({
    where: { id: employee.id },
    data: { accessCodeHash: await bcrypt.hash(code, 10), accessCodeUpdatedAt: new Date() }
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      entity: "Employee",
      entityId: employee.id,
      action: "ACCESS_CODE_SET",
      metadata: { mode: input.code ? "manual" : "generate" }
    }
  });

  res.json({ employeeId: employee.id, employeeName: employee.name, code });
}));

// Revoga o acesso do colaborador ao portal (RH).
employeesRouter.delete("/:id/access-code", requireRole(Role.RH), asyncHandler(async (req, res) => {
  const actor = (req as AuthenticatedRequest).user;
  const employee = await prisma.employee.findUnique({ where: { id: req.params.id } });
  if (!employee) return res.status(404).json({ message: "Funcionário não encontrado." });

  await prisma.employee.update({
    where: { id: employee.id },
    data: { accessCodeHash: null, accessCodeUpdatedAt: null }
  });

  await prisma.auditLog.create({
    data: { actorId: actor.id, entity: "Employee", entityId: employee.id, action: "ACCESS_CODE_REVOKED" }
  });

  res.json({ employeeId: employee.id });
}));

// Gera códigos para todos os ativos sem acesso (RH). A lista com os códigos
// é retornada UMA única vez para impressão/entrega dentro da empresa;
// depois, só reemissão individual. Perdeu o código = reemitir.
employeesRouter.post("/access-codes/batch", requireRole(Role.RH), asyncHandler(async (req, res) => {
  const actor = (req as AuthenticatedRequest).user;
  const pending = await prisma.employee.findMany({
    where: { status: EmployeeStatus.ACTIVE, accessCodeHash: null },
    orderBy: [{ name: "asc" }]
  });

  const issued: Array<{ employeeId: string; employeeName: string; code: string }> = [];
  for (const employee of pending) {
    const code = generateAccessCode();
    await prisma.employee.update({
      where: { id: employee.id },
      data: { accessCodeHash: await bcrypt.hash(code, 10), accessCodeUpdatedAt: new Date() }
    });
    issued.push({ employeeId: employee.id, employeeName: employee.name, code });
  }

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      entity: "Employee",
      action: "ACCESS_CODE_BATCH",
      metadata: { count: issued.length, employeeIds: issued.map((item) => item.employeeId) }
    }
  });

  res.json({ issued, count: issued.length });
}));
