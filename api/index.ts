// Vercel serverless: reaproveita o app Express (mesmas rotas do Docker).
// Boot com porta, Socket.IO e node-cron só acontece em direct run
// (ver server.ts) — aqui exportamos só o handler.
import { app } from "../backend/src/server.js";

export default app;
