import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";

export const usersRouter = Router();

usersRouter.use(authenticate, requireRole(Role.RH));

const userSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6).optional(),
  role: z.nativeEnum(Role),
  active: z.boolean().optional()
});

const serializeUser = (user: {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  active: user.active,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

usersRouter.get("/", asyncHandler(async (_req, res) => {
  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });
  res.json({ users: users.map(serializeUser) });
}));

usersRouter.post("/", asyncHandler(async (req, res) => {
  const actor = (req as AuthenticatedRequest).user;
  const input = userSchema.extend({ password: z.string().min(6) }).parse(req.body);
  const passwordHash = await bcrypt.hash(input.password, 10);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
      active: input.active ?? true
    }
  });

  await prisma.auditLog.create({
    data: { actorId: actor.id, entity: "User", entityId: user.id, action: "CREATE_USER" }
  });

  res.status(201).json({ user: serializeUser(user) });
}));

usersRouter.put("/:id", asyncHandler(async (req, res) => {
  const actor = (req as AuthenticatedRequest).user;
  const input = userSchema.parse(req.body);
  const data = {
    name: input.name,
    email: input.email,
    role: input.role,
    active: input.active ?? true,
    ...(input.password ? { passwordHash: await bcrypt.hash(input.password, 10) } : {})
  };

  const user = await prisma.user.update({ where: { id: req.params.id }, data });

  await prisma.auditLog.create({
    data: { actorId: actor.id, entity: "User", entityId: user.id, action: "UPDATE_USER" }
  });

  res.json({ user: serializeUser(user) });
}));
