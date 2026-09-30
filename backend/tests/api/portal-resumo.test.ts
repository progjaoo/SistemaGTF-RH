// API: resumo financeiro do colaborador no portal (plan-015 Task 5).
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../src/lib/prisma.js";
import { app } from "../../src/server.js";
import { cleanup, createEmployee, createPeriod, createPrice, createUser, d } from "../helpers.js";

const TAG = "portalresumo";
let rhToken = "";
let employeeId = "";
let portalToken = "";
let periodId = "";
const ids = { userIds: [] as string[], periodIds: [] as string[], employeeIds: [] as string[], priceIds: [] as string[], recordIds: [] as string[] };

beforeAll(async () => {
  const rh = await createUser(`${TAG}-rh`, "RH");
  ids.userIds.push(rh.id);
  rhToken = (await request(app).post("/api/auth/login").send({ email: rh.email, password: "senha-teste" })).body.token;

  const emp = await createEmployee(TAG);
  employeeId = emp.id;
  ids.employeeIds.push(emp.id);

  const period = await createPeriod(TAG, "2032-05-01", "2032-05-31");
  periodId = period.id;
  ids.periodIds.push(period.id);

  const price = await createPrice(10, "2026-01-01");
  ids.priceIds.push(price.id);

  for (const [day, status] of [["2032-05-10", "PEGUEI"], ["2032-05-11", "NAO_PEGUEI"], ["2032-05-12", "PENDING"]] as const) {
    const record = await prisma.mealRecord.create({
      data: { employeeId, periodId, date: d(day), quantity: 1, confirmationStatus: status, registeredById: rh.id }
    });
    ids.recordIds.push(record.id);
  }

  const gen = await request(app).put(`/api/employees/${employeeId}/access-code`)
    .set("Authorization", `Bearer ${rhToken}`).send({});
  portalToken = (await request(app).post("/api/employee-portal/login")
    .send({ employeeId, code: gen.body.code })).body.token;
});

afterAll(() => cleanup(ids));

describe("GET /employee-portal/:id/resumo", () => {
  it("retorna valor vigente, lançamentos e desconto previsto (só PEGUEI)", async () => {
    const res = await request(app).get(`/api/employee-portal/${employeeId}/resumo?month=2032-05`)
      .set("Authorization", `Bearer ${portalToken}`);
    expect(res.status).toBe(200);
    expect(res.body.unitPrice).toBe(10);
    expect(res.body.period?.id).toBe(periodId);
    expect(res.body.launches).toHaveLength(3);
    expect(res.body.totals.taken).toBe(1);
    expect(res.body.totals.notTaken).toBe(1);
    expect(res.body.totals.pending).toBe(1);
    expect(res.body.totals.forecastAmount).toBe(10);
  });

  it("mês sem período → 200 com period null e totais zerados", async () => {
    const res = await request(app).get(`/api/employee-portal/${employeeId}/resumo?month=2033-01`)
      .set("Authorization", `Bearer ${portalToken}`);
    expect(res.status).toBe(200);
    expect(res.body.period).toBeNull();
    expect(res.body.launches).toEqual([]);
    expect(res.body.totals.forecastAmount).toBe(0);
  });

  it("sessão de outro colaborador → 403; sem token → 401", async () => {
    const other = await createEmployee(`${TAG}-other`);
    ids.employeeIds.push(other.id);
    await request(app).get(`/api/employee-portal/${other.id}/resumo?month=2032-05`)
      .set("Authorization", `Bearer ${portalToken}`).expect(403);
    await request(app).get(`/api/employee-portal/${employeeId}/resumo?month=2032-05`).expect(401);
  });
});
