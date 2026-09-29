import webpush from "web-push";
import cron from "node-cron";
import { BillingStatus, EmployeeStatus } from "@prisma/client";
import { config } from "../config.js";
import { prisma } from "../lib/prisma.js";
import { formatDateKeyInSaoPaulo } from "../services/date-rules.js";

// Sem chaves (dev local sem .env), web-push lançaria no import e o boot
// da API cairia — inclusive nos testes, que importam server.ts. Com o
// guard o lembrete só fica desativado até as chaves chegarem.
if (config.vapidPublicKey && config.vapidPrivateKey) {
  webpush.setVapidDetails(config.vapidContact, config.vapidPublicKey, config.vapidPrivateKey);
} else {
  console.warn("[push] VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY ausentes — lembretes push desativados.");
}

export async function sendLunchReminders(todayKey = formatDateKeyInSaoPaulo()) {
  if (!config.vapidPublicKey || !config.vapidPrivateKey) {
    console.log(`[push] sem chaves VAPID, lembrete pulado.`);
    return { sent: 0, skipped: true as const };
  }
  const openPeriod = await prisma.billingPeriod.findFirst({
    where: { status: BillingStatus.OPEN, startDate: { lte: new Date(`${todayKey}T00:00:00Z`) }, endDate: { gte: new Date(`${todayKey}T00:00:00Z`) } }
  });
  if (!openPeriod) {
    console.log(`[push] sem período aberto em ${todayKey}, lembrete pulado.`);
    return { sent: 0, skipped: true as const };
  }
  const subs = await prisma.pushSubscription.findMany({
    where: { employee: { status: EmployeeStatus.ACTIVE } },
    select: { endpoint: true, p256dh: true, auth: true }
  });
  const payload = JSON.stringify({
    title: "Hora do almoço 🍽️",
    body: "Marque se você pegou ou não pegou o almoço de hoje.",
    url: "/colaborador/"
  });
  let sent = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
      sent++;
    } catch (error) {
      // 404/410 = inscrição morta → limpa para não tentar de novo.
      const statusCode = (error as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await prisma.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } });
      } else {
        console.error(`[push] falha ao enviar para ${sub.endpoint}:`, error);
      }
    }
  }
  console.log(`[push] lembrete 14:30 enviado para ${sent}/${subs.length}.`);
  return { sent, skipped: false as const };
}

export function startLunchReminderScheduler() {
  cron.schedule("30 14 * * *", () => {
    void sendLunchReminders().catch((error) => console.error("[push] erro no agendador:", error));
  }, { timezone: "America/Sao_Paulo" });
}
