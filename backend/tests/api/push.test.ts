// API: push subscriptions + agendador 14:30 — PLAN-006.
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { config } from "../../src/config.js";
import { prisma } from "../../src/lib/prisma.js";
import { app } from "../../src/server.js";
import { sendLunchReminders } from "../../src/services/push.js";
import { cleanup, createEmployee, createUser } from "../helpers.js";

const { sendNotificationMock } = vi.hoisted(() => ({ sendNotificationMock: vi.fn() }));
vi.mock("web-push", () => ({
  default: { setVapidDetails: vi.fn(), sendNotification: sendNotificationMock }
}));

const TAG = "push";
let rhToken = "";
let portalToken = "";
let employeeId = "";
let otherToken = "";
const ids = { userIds: [] as string[], employeeIds: [] as string[] };
const SUB = { endpoint: "https://fcm.test/push/abc123", keys: { p256dh: "p256dh-fake", auth: "auth-fake" } };

beforeAll(async () => {
  // Sem backend/.env no repo, as chaves VAPID chegam vazias — fixa par
  // fake em memória para o GET vapid-key ser testável (truthy).
  config.vapidPublicKey = "BM-test-public-key-plan-006";
  config.vapidPrivateKey = "test-private-key-plan-006";
  const rh = await createUser(`${TAG}-rh`, "RH");
  ids.userIds.push(rh.id);
  rhToken = (await request(app).post("/api/auth/login").send({ email: rh.email, password: "senha-teste" })).body.token;
  const emp = await createEmployee(TAG);
  employeeId = emp.id;
  ids.employeeIds.push(emp.id);
  // Ativa o acesso ao portal para este funcionário.
  const gen = await request(app).put(`/api/employees/${emp.id}/access-code`)
    .set("Authorization", `Bearer ${rhToken}`).send({});
  portalToken = (await request(app).post("/api/employee-portal/login")
    .send({ employeeId: emp.id, code: gen.body.code })).body.token;
  // Segundo colaborador para o teste de isolamento (403).
  const other = await createEmployee(`${TAG}-other`);
  ids.employeeIds.push(other.id);
  const genOther = await request(app).put(`/api/employees/${other.id}/access-code`)
    .set("Authorization", `Bearer ${rhToken}`).send({});
  otherToken = (await request(app).post("/api/employee-portal/login")
    .send({ employeeId: other.id, code: genOther.body.code })).body.token;
});

afterAll(async () => {
  await prisma.pushSubscription.deleteMany({ where: { employeeId: { in: ids.employeeIds } } });
  await cleanup(ids);
});

describe("push subscriptions", () => {
  it("GET vapid-key retorna chave pública", async () => {
    const res = await request(app).get(`/api/employee-portal/${employeeId}/push/vapid-key`)
      .set("Authorization", `Bearer ${portalToken}`);
    expect(res.status).toBe(200);
    expect(res.body.publicKey).toBeTruthy();
  });

  it("POST cria subscription (201) e repete idempotente", async () => {
    const r1 = await request(app).post(`/api/employee-portal/${employeeId}/push/subscriptions`)
      .set("Authorization", `Bearer ${portalToken}`).send(SUB);
    expect(r1.status).toBe(201);
    expect(r1.body.subscription.endpoint).toBe(SUB.endpoint);
    const r2 = await request(app).post(`/api/employee-portal/${employeeId}/push/subscriptions`)
      .set("Authorization", `Bearer ${portalToken}`).send(SUB);
    expect(r2.status).toBe(201);
    expect(r2.body.subscription.id).toBe(r1.body.subscription.id);
  });

  it("funcionário não gerencia outro (403)", async () => {
    const res = await request(app).get(`/api/employee-portal/${employeeId}/push/vapid-key`)
      .set("Authorization", `Bearer ${otherToken}`);
    expect(res.status).toBe(403);
  });

  it("DELETE remove", async () => {
    const del = await request(app).delete(`/api/employee-portal/${employeeId}/push/subscriptions`)
      .set("Authorization", `Bearer ${portalToken}`).send({ endpoint: SUB.endpoint });
    expect(del.status).toBe(200);
    expect(del.body.ok).toBe(true);
    const row = await prisma.pushSubscription.findUnique({ where: { endpoint: SUB.endpoint } });
    expect(row).toBeNull();
    const re = await request(app).post(`/api/employee-portal/${employeeId}/push/subscriptions`)
      .set("Authorization", `Bearer ${portalToken}`).send(SUB);
    expect(re.status).toBe(201);
  });
});

describe("sendLunchReminders", () => {
  it("pula sem período OPEN (sem envio, sem erro)", async () => {
    sendNotificationMock.mockClear();
    const result = await sendLunchReminders("2019-05-05");
    expect(result).toEqual({ sent: 0, skipped: true });
    expect(sendNotificationMock).not.toHaveBeenCalled();
  });
});
