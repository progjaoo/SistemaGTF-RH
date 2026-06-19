import { EmployeeStatus, Role, ScheduleType } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { parseDate } from "../lib/dates.js";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";

export const employeesRouter = Router();

employeesRouter.use(authenticate);

const employeeSchema = z.object({
  name: z.string().min(2),
  status: z.nativeEnum(EmployeeStatus).optional(),
  scheduleType: z.nativeEnum(ScheduleType),
  admissionDate: z.string().optional().nullable(),
  terminationDate: z.string().optional().nullable()
});

const serializeEmployee = (employee: {
  id: string;
  name: string;
  status: EmployeeStatus;
  scheduleType: ScheduleType;
  admissionDate: Date | null;
  terminationDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  ...employee,
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
