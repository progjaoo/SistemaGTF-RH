// API: só PEGUEI é faturável (PLAN-005).
import request from "supertest";
import { describe, expect, it, afterAll, beforeAll } from "vitest";
import { prisma } from "../../src/lib/prisma.js";
import { app } from "../../src/server.js";
import { cleanup, createEmployee, createPeriod, createPrice, createUser, d } from "../helpers.js";

const TAG = "billable";
let token = "";
const ids = { userIds: [] as string[], periodIds: [] as string[], employeeIds: [] as string[], priceIds: [] as string[] };

beforeAll(async () => {
  const rh = await createUser(`${TAG}-rh`, "RH");
  ids.userIds.push(rh.id);
  token = (await request(app).post("/api/auth/login").send({ email: rh.email, password: "senha-teste" })).body.token;
  const emp = await createEmployee(TAG);
  ids.employeeIds.push(emp.id);
  const period = await createPeriod(TAG, "2021-05-01", "2021-05-31");
  ids.periodIds.push(period.id);
  const price = await createPrice(10, "2021-01-01");
  ids.priceIds.push(price.id);
  for (const [day, status] of [["2021-05-10", "PEGUEI"], ["2021-05-11", "NAO_PEGUEI"], ["2021-05-12", "PENDING"]] as const) {
    await prisma.mealRecord.create({
      data: { employeeId: emp.id, periodId: period.id, date: d(day), quantity: 1, confirmationStatus: status, registeredById: rh.id }
    });
  }
  (globalThis as Record<string, string>).__BILLABLE_PERIOD__ = period.id;
});

afterAll(() => cleanup(ids));

describe("faturamento pelo colaborador", () => {
  it("relatório soma só PEGUEI", async () => {
    const periodId = (globalThis as Record<string, string>).__BILLABLE_PERIOD__;
    const res = await request(app).get(`/api/billing-periods/${periodId}/report`).set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.report.totalQuantity).toBe(1);
    expect(res.body.report.totalAmount).toBe(10);
    const row = res.body.report.employeeTotals[0];
    expect(row.quantity).toBe(1);
    expect(row.taken).toBe(1);
    expect(row.notTaken).toBe(1);
    expect(row.pending).toBe(1);
  });
});
