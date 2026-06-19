import dotenv from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const envPaths = [
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "backend/.env")
];

for (const envPath of envPaths) {
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

const localDatabaseUrl = "postgresql://postgres:mysecretpassword@localhost:5432/sistema_rh?schema=public";
const databaseUrl = process.env.DATABASE_URL ?? localDatabaseUrl;

if (!process.env.DATABASE_URL && process.env.NODE_ENV !== "production") {
  process.env.DATABASE_URL = databaseUrl;
  console.warn("DATABASE_URL nao definida. Usando conexao local padrao do docker-compose.");
}

export const config = {
  port: Number(process.env.PORT ?? 3333),
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-me",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  databaseUrl
};
