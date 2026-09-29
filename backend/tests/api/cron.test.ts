// API: endpoint do Vercel Cron (serverless) — PLAN-014.
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { app } from "../../src/server.js";

describe("POST /api/cron/push-reminders", () => {
  afterAll(() => {
    delete process.env.CRON_SECRET;
  });

  it("401 sem segredo configurado", async () => {
    delete process.env.CRON_SECRET;
    const res = await request(app).post("/api/cron/push-reminders").send({});
    expect(res.status).toBe(401);
  });

  it("401 com token errado", async () => {
    process.env.CRON_SECRET = "segredo-cron-teste";
    const res = await request(app).post("/api/cron/push-reminders")
      .set("Authorization", "Bearer errado").send({});
    expect(res.status).toBe(401);
  });

  it("200 com token certo (sem VAPID em teste → skipped)", async () => {
    process.env.CRON_SECRET = "segredo-cron-teste";
    const res = await request(app).post("/api/cron/push-reminders")
      .set("Authorization", "Bearer segredo-cron-teste").send({});
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
