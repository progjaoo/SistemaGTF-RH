import type { Request, Response } from "express";
import { rateLimit } from "express-rate-limit";
import { prisma } from "../lib/prisma.js";

function auditBlocked(req: Request, scope: string) {
  void prisma.auditLog
    .create({
      data: {
        entity: "RateLimit",
        action: scope,
        metadata: {
          route: req.originalUrl,
          ip: req.ip ?? null,
          userAgent: req.get("user-agent") ?? null
        }
      }
    })
    .catch((error) => console.error("Falha ao auditar rate-limit:", error));
}

function limiter(scope: string, windowMs: number, limit: number) {
  // Testes automatizados fazem dezenas de logins no mesmo minuto contra o
  // mesmo IP: RATE_LIMIT_DISABLED=1 (só em tests/setup.ts) desliga o limite.
  // O comportamento real do 429 é verificado nos scripts E2E (Fase 1/Parte A).
  if (process.env.RATE_LIMIT_DISABLED === "1") {
    return (_req: Request, _res: Response, next: () => void) => next();
  }
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    // O app confia apenas em proxy loopback (ver server.ts); IPs vêm do
    // X-Forwarded-For do Nginx. Desliga a validação padrão da lib que
    // exigiria configuração extra de trust proxy.
    validate: { trustProxy: false },
    message: { message: "Muitas tentativas. Aguarde um minuto e tente de novo." },
    handler: (req: Request, res: Response) => {
      auditBlocked(req, scope);
      res.status(429).json({ message: "Muitas tentativas. Aguarde um minuto e tente de novo." });
    }
  });
}

// Login administrativo: 10 tentativas/min por IP.
export const loginLimiter = limiter("LOGIN_RATE_LIMITED", 60_000, 10);

// Portal público do colaborador: 60 req/min por IP (anti-robô sem travar uso real).
export const portalLimiter = limiter("PORTAL_RATE_LIMITED", 60_000, 60);

// Login do portal: 10 tentativas/min por IP (código de 6 dígitos + bcrypt
// só são seguros com limite estrito contra força bruta).
export const portalLoginLimiter = limiter("PORTAL_LOGIN_RATE_LIMITED", 60_000, 10);
