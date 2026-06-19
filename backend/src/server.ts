import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { config } from "./config.js";
import { openApiDocument } from "./docs/openapi.js";
import { authRouter } from "./routes/auth.js";
import { billingPeriodsRouter } from "./routes/billing-periods.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { employeesRouter } from "./routes/employees.js";
import { mealPricesRouter } from "./routes/meal-prices.js";
import { mealRecordsRouter } from "./routes/meal-records.js";
import { usersRouter } from "./routes/users.js";

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'", "'unsafe-inline'"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "img-src": ["'self'", "data:"]
    }
  }
}));
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "Sistema RH Grupo GTF" });
});

app.get("/api/docs.json", (_req, res) => {
  res.json(openApiDocument);
});
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument, {
  customSiteTitle: "Sistema RH API",
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true
  }
}));

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/employees", employeesRouter);
app.use("/api/meal-prices", mealPricesRouter);
app.use("/api/meal-records", mealRecordsRouter);
app.use("/api/billing-periods", billingPeriodsRouter);
app.use("/api/dashboard", dashboardRouter);

function isPrismaRuntimeError(error: unknown) {
  if (!(error instanceof Error)) return false;

  return error.name.includes("Prisma")
    || error.message.includes("Invalid `prisma.")
    || error.message.includes("Environment variable not found: DATABASE_URL")
    || error.message.includes("Can't reach database server")
    || error.message.includes("Timed out fetching a new connection");
}

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof ZodError) {
    return res.status(422).json({ message: "Dados inválidos.", issues: error.flatten() });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Registro duplicado para uma chave única." });
    }
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Registro não encontrado." });
    }
  }

  if (isPrismaRuntimeError(error)) {
    console.error("Erro no Prisma:", error);

    return res.status(503).json({
      message: "Banco de dados indisponível ou não configurado. Verifique se o PostgreSQL está ativo e se a API foi reiniciada."
    });
  }

  if (error instanceof Error) {
    console.error("Erro inesperado:", error);
    return res.status(500).json({ message: "Erro interno no servidor." });
  }

  return res.status(500).json({ message: "Erro interno no servidor." });
});

app.listen(config.port, () => {
  console.log(`Sistema RH API listening on http://localhost:${config.port}`);
});
