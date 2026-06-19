import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { Role } from "@prisma/client";
import { config } from "../config.js";
import { prisma } from "../lib/prisma.js";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type AuthenticatedRequest = Request & {
  user: SessionUser;
};

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Sessão não autenticada." });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as { sub: string };
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });

    if (!user || !user.active) {
      return res.status(401).json({ message: "Usuário inativo ou inexistente." });
    }

    (req as AuthenticatedRequest).user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    return next();
  } catch {
    return res.status(401).json({ message: "Token inválido ou expirado." });
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthenticatedRequest).user;
    if (!roles.includes(user.role)) {
      return res.status(403).json({ message: "Acesso restrito ao perfil autorizado." });
    }

    return next();
  };
}
