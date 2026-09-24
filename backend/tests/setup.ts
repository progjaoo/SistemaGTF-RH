// Setup global do vitest: banco dedicado + migrations aplicadas.
// Banco padrão: postgres do aglomerado local (`docker-compose.local.yml`).
// Override: DATABASE_URL="postgresql://..." npm test
import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

process.env.DATABASE_URL ??=
  "postgresql://postgres:postgres@localhost:5433/sistema_rh_test?schema=public";
process.env.JWT_SECRET ??= "segredo-apenas-para-testes";
process.env.CORS_ORIGIN ??= "http://localhost:5173";
process.env.PORT ??= "3399";
// Ver comentário em src/middleware/rate-limit.ts.
process.env.RATE_LIMIT_DISABLED = "1";

function dbNameOf(url: string) {
  return new URL(url).pathname.replace(/^\//, "");
}

// setupFiles executa o módulo (não chama exports): o bloco async roda no top-level.
const url = process.env.DATABASE_URL!;
const adminUrl = new URL(url);
adminUrl.pathname = "/postgres";
const admin = new PrismaClient({ datasources: { db: { url: adminUrl.toString() } } });
try {
  await admin.$executeRawUnsafe(`CREATE DATABASE "${dbNameOf(url)}"`);
} catch (error) {
  // 42P04 = já existe; qualquer outra coisa é erro real.
  if (!(error instanceof Error && "code" in error && (error as { code: string }).code === "42P04") && !String(error).includes("already exists")) {
    throw error;
  }
} finally {
  await admin.$disconnect();
}

execSync("npx prisma migrate deploy", {
  stdio: "pipe",
  env: { ...process.env, DATABASE_URL: url }
});
