// API: gestora/RH marca confirmação manual (WhatsApp) — PLAN-005.
import request from "supertest";
import { describe, expect, it, afterAll, beforeAll } from "vitest";
import { app } from "../../src/server.js";
import { cleanup, createEmployee, createPeriod, createUser } from "../helpers.js";

const TAG = "manualconf";
let rhToken = "", gestToken = "", employeeId = "", periodId = "";
const ids = { userIds: [] as string[], periodIds: [] as string[], employeeIds: [] as string[] };

beforeAll(async () => {
  const rh = await createUser(`${TAG}-rh`, "RH");
  const gest = await createUser(`${TAG}-gest`, "GESTORA");
  ids.userIds.push(rh.id, gest.id);
  rhToken = (await request(app).post("/api/auth/login").send({ email: rh.email, password: "senha-teste" })).body.token;
  gestToken = (await request(app).post("/api/auth/login").send({ email: gest.email, password: "senha-teste" })).body.token;
  const emp = await createEmployee(TAG);
  employeeId = emp.id;
  ids.employeeIds.push(emp.id);
  const period = await createPeriod(TAG, "2021-06-01", "2021-06-30");
  periodId = period.id;
  ids.periodIds.push(period.id);
});

afterAll(() => cleanup(ids));

const mark = (token: string, body: object) =>
  request(app).post("/api/meal-records/confirmations").set("Authorization", `Bearer ${token}`).send(body);

describe("manual confirmation", () => {
  it("gestora cria PEGUEI sem lançamento prévio (200, WHATSAPP)", async () => {
    const res = await mark(gestToken, { employeeId, date: "2021-06-10", status: "PEGUEI", note: "confirmado no zap" });
    expect(res.status).toBe(200);
    expect(res.body.confirmation.confirmationStatus).toBe("PEGUEI");
    expect(res.body.confirmation.confirmationSource).toBe("WHATSAPP");
  });

  it("aparece na conferência do dia", async () => {
    const res = await request(app).get(`/api/meal-records/confirmations?periodId=${periodId}&date=2021-06-10`)
      .set("Authorization", `Bearer ${gestToken}`);
    expect(res.body.confirmations.some((c) => c.employeeId === employeeId && c.confirmationStatus === "PEGUEI")).toBe(true);
  });

  it("gestora corrige confirmação existente", async () => {
    const res = await mark(gestToken, { employeeId, date: "2021-06-10", status: "NAO_PEGUEI", note: "avisou no zap que não foi" });
    expect(res.status).toBe(200);
    expect(res.body.confirmation.confirmationStatus).toBe("NAO_PEGUEI");
  });

  it("data futura dá 422; sem token dá 401", async () => {
    expect((await mark(gestToken, { employeeId, date: "2099-01-01", status: "PEGUEI" })).status).toBe(422);
    expect((await request(app).post("/api/meal-records/confirmations").send({ employeeId, date: "2021-06-11", status: "PEGUEI" })).status).toBe(401);
  });
});
