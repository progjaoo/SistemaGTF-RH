import bcrypt from "bcryptjs";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { config } from "../config.js";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate, type AuthenticatedRequest } from "../middleware/auth.js";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

authRouter.post("/login", asyncHandler(async (req, res) => {
  const input = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  if (!user || !user.active) {
    return res.status(401).json({ message: "E-mail ou senha inválidos." });
  }

  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordMatches) {
    return res.status(401).json({ message: "E-mail ou senha inválidos." });
  }

  const token = jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: "12h" });

  await prisma.auditLog.create({
    data: { actorId: user.id, entity: "User", entityId: user.id, action: "LOGIN" }
  });

  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
}));

authRouter.get("/me", authenticate, (req, res) => {
  res.json({ user: (req as AuthenticatedRequest).user });
});
