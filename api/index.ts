// Vercel serverless: importa o backend COMPILADO (backend/dist) para que o
// file-tracing inclua JS real — TS cru fora de api/ não é empacotado.
import { app } from "../backend/dist/src/server.js";

export default app;
