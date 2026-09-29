import { Router } from "express";
import { sendLunchReminders } from "../services/push.js";

export const cronRouter = Router();

// Disparado pelo Vercel Cron (14:30 SP = 17:30 UTC) em vez do node-cron,
// que não sobrevive em serverless. Autenticado via CRON_SECRET (o Vercel
// envia `Authorization: Bearer <CRON_SECRET>` automaticamente).
cronRouter.post("/push-reminders", async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.get("authorization") !== `Bearer ${secret}`) {
    return res.status(401).json({ message: "Não autorizado." });
  }
  const result = await sendLunchReminders();
  return res.json({ ok: true, ...result });
});
